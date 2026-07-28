// (o==================================================================o)
//   #region EMPLOYEES ROUTES
// (o-----------------------------------------------------------\/-----o)

import { parse_list_query } from "@opus-perpetuus/kirel-nox-kit";
import type { KirletIdentity } from "@opus-perpetuus/kirel-nox-kit";
import { get_db } from "../../db.ts";
import {
  json,
  error,
  not_found,
  method_not_allowed,
  new_id,
  now_iso,
  today_iso,
} from "../../http.ts";
import { require_access, actor_from } from "../../auth.ts";
import { append_history } from "../../history.ts";
import {
  normalize_employee_input,
  type Employee,
} from "./schema.ts";

const SORTABLE = new Set([
  "name",
  "full_name",
  "email",
  "hired_at",
  "created_at",
  "updated_at",
]);

export async function handle_employees(
  req: Request,
  path: string,
  url: URL,
  identity: KirletIdentity | null,
): Promise<Response | null> {
  // /employees/:id/team
  const team_match = path.match(/^\/employees\/([^/]+)\/team$/);
  if (team_match) {
    if (req.method !== "GET") return method_not_allowed(["GET"]);
    const denied = require_access(identity, "employees", "read");
    if (denied) return denied;
    return get_team(team_match[1]!);
  }

  // /employees/:id
  const one = path.match(/^\/employees\/([^/]+)$/);
  if (one) {
    const id = one[1]!;
    if (req.method === "GET") {
      const denied = require_access(identity, "employees", "read");
      if (denied) return denied;
      return get_one(id);
    }
    if (req.method === "PATCH") {
      const denied = require_access(identity, "employees", "update");
      if (denied) return denied;
      return patch_one(req, id, identity);
    }
    if (req.method === "DELETE") {
      const denied = require_access(identity, "employees", "delete");
      if (denied) return denied;
      return soft_delete(id, identity);
    }
    return method_not_allowed(["GET", "PATCH", "DELETE"]);
  }

  if (path === "/employees") {
    if (req.method === "GET") {
      const denied = require_access(identity, "employees", "read");
      if (denied) return denied;
      return list(url);
    }
    if (req.method === "POST") {
      const denied = require_access(identity, "employees", "create");
      if (denied) return denied;
      return create(req, identity);
    }
    return method_not_allowed(["GET", "POST"]);
  }

  return null;
}

function row_to_employee(r: Record<string, unknown>): Employee {
  return {
    id: String(r.id),
    name: String(r.name),
    full_name: String(r.full_name),
    email: String(r.email),
    department_id: (r.department_id as string) ?? null,
    position_id: (r.position_id as string) ?? null,
    manager_id: (r.manager_id as string) ?? null,
    hired_at: (r.hired_at as string) ?? null,
    phone: (r.phone as string) ?? null,
    rfc: (r.rfc as string) ?? null,
    curp: (r.curp as string) ?? null,
    nss: (r.nss as string) ?? null,
    is_active: Number(r.is_active),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

function list(url: URL): Response {
  const db = get_db();
  if (url.searchParams.get("as") === "options") {
    const rows = db
      .query(
        `SELECT id, name, full_name FROM employees WHERE is_active = 1 ORDER BY name ASC`,
      )
      .all() as Array<{ id: string; name: string; full_name: string }>;
    return json({
      data: rows.map((r) => ({
        value: r.id,
        label: r.full_name || r.name,
      })),
    });
  }

  const q = parse_list_query(url.searchParams);
  const include_inactive = url.searchParams.get("include_inactive") === "1";
  const where: string[] = [];
  const params: unknown[] = [];

  if (!include_inactive) {
    where.push("is_active = 1");
  }
  if (q.q) {
    where.push(
      `(name LIKE ? OR full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR rfc LIKE ?)`,
    );
    const like = `%${q.q}%`;
    params.push(like, like, like, like, like);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  let order = "ORDER BY name ASC";
  if (q.sort) {
    const [col, dir] = q.sort.split(":");
    if (col && SORTABLE.has(col) && (dir === "asc" || dir === "desc")) {
      order = `ORDER BY ${col} ${dir.toUpperCase()}`;
    }
  }

  const total = (
    db
      .query(`SELECT COUNT(*) AS c FROM employees ${clause}`)
      .get(...params) as { c: number }
  ).c;

  const rows = db
    .query(
      `SELECT * FROM employees ${clause} ${order} LIMIT ? OFFSET ?`,
    )
    .all(...params, q.take, q.skip) as Array<Record<string, unknown>>;

  return json({
    data: rows.map(row_to_employee),
    total,
  });
}

function get_one(id: string): Response {
  const db = get_db();
  const row = db
    .query(`SELECT * FROM employees WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!row) return not_found(`/employees/${id}`);
  return json({ data: row_to_employee(row) });
}

function get_team(id: string): Response {
  const db = get_db();
  const manager = db
    .query(`SELECT id FROM employees WHERE id = ?`)
    .get(id) as { id: string } | null;
  if (!manager) return not_found(`/employees/${id}`);
  const rows = db
    .query(
      `SELECT * FROM employees WHERE manager_id = ? AND is_active = 1 ORDER BY name ASC`,
    )
    .all(id) as Array<Record<string, unknown>>;
  return json({ data: rows.map(row_to_employee), total: rows.length });
}

async function create(
  req: Request,
  identity: KirletIdentity | null,
): Promise<Response> {
  try {
    const body = await req.json();
    const input = normalize_employee_input(body) as {
      name: string;
      full_name: string;
      email: string;
      department_id?: string | null;
      position_id?: string | null;
      manager_id?: string | null;
      hired_at?: string | null;
      phone?: string | null;
      rfc?: string | null;
      curp?: string | null;
      nss?: string | null;
    };

    const db = get_db();
    const existing = db
      .query(`SELECT id FROM employees WHERE email = ?`)
      .get(input.email) as { id: string } | null;
    if (existing) {
      return error("conflict", "El correo ya está registrado", 409);
    }

    const id = new_id("emp");
    const iso = now_iso();
    const row: Employee = {
      id,
      name: input.name || input.full_name,
      full_name: input.full_name,
      email: input.email,
      department_id: input.department_id ?? null,
      position_id: input.position_id ?? null,
      manager_id: input.manager_id ?? null,
      hired_at: input.hired_at ?? today_iso(),
      phone: input.phone ?? null,
      rfc: input.rfc ?? null,
      curp: input.curp ?? null,
      nss: input.nss ?? null,
      is_active: 1,
      created_at: iso,
      updated_at: iso,
    };

    try {
      db.query(
        `INSERT INTO employees (
          id, name, full_name, email, department_id, position_id, manager_id,
          hired_at, phone, rfc, curp, nss, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        row.id,
        row.name,
        row.full_name,
        row.email,
        row.department_id,
        row.position_id,
        row.manager_id,
        row.hired_at,
        row.phone,
        row.rfc,
        row.curp,
        row.nss,
        row.is_active,
        row.created_at,
        row.updated_at,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("UNIQUE") || msg.includes("unique")) {
        return error("conflict", "El correo ya está registrado", 409);
      }
      throw e;
    }

    append_history({
      resource: "employees",
      record_id: id,
      action: "create",
      summary: `Empleado creado: ${row.full_name}`,
      payload: { after: row },
      actor: actor_from(identity),
    });

    return json({ data: row }, 201);
  } catch (err) {
    return error(
      "validation_error",
      err instanceof Error ? err.message : String(err),
      400,
    );
  }
}

async function patch_one(
  req: Request,
  id: string,
  identity: KirletIdentity | null,
): Promise<Response> {
  try {
    const db = get_db();
    const existing = db
      .query(`SELECT * FROM employees WHERE id = ?`)
      .get(id) as Record<string, unknown> | null;
    if (!existing) return not_found(`/employees/${id}`);
    const before = row_to_employee(existing);

    const body = await req.json();
    const input = normalize_employee_input({ ...before, ...body }, true);

    if (input.email && input.email !== before.email) {
      const dup = db
        .query(`SELECT id FROM employees WHERE email = ? AND id != ?`)
        .get(input.email, id) as { id: string } | null;
      if (dup) {
        return error("conflict", "El correo ya está registrado", 409);
      }
    }

    const updated: Employee = {
      ...before,
      name: (input.name as string) ?? before.name,
      full_name: (input.full_name as string) ?? before.full_name,
      email: (input.email as string) ?? before.email,
      department_id:
        input.department_id !== undefined
          ? (input.department_id as string | null)
          : before.department_id,
      position_id:
        input.position_id !== undefined
          ? (input.position_id as string | null)
          : before.position_id,
      manager_id:
        input.manager_id !== undefined
          ? (input.manager_id as string | null)
          : before.manager_id,
      hired_at:
        input.hired_at !== undefined
          ? (input.hired_at as string | null)
          : before.hired_at,
      phone:
        input.phone !== undefined ? (input.phone as string | null) : before.phone,
      rfc: input.rfc !== undefined ? (input.rfc as string | null) : before.rfc,
      curp:
        input.curp !== undefined ? (input.curp as string | null) : before.curp,
      nss: input.nss !== undefined ? (input.nss as string | null) : before.nss,
      is_active:
        input.is_active !== undefined
          ? Number(input.is_active)
          : before.is_active,
      updated_at: now_iso(),
    };

    try {
      db.query(
        `UPDATE employees SET
          name=?, full_name=?, email=?, department_id=?, position_id=?, manager_id=?,
          hired_at=?, phone=?, rfc=?, curp=?, nss=?, is_active=?, updated_at=?
         WHERE id=?`,
      ).run(
        updated.name,
        updated.full_name,
        updated.email,
        updated.department_id,
        updated.position_id,
        updated.manager_id,
        updated.hired_at,
        updated.phone,
        updated.rfc,
        updated.curp,
        updated.nss,
        updated.is_active,
        updated.updated_at,
        id,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("UNIQUE") || msg.includes("unique")) {
        return error("conflict", "El correo ya está registrado", 409);
      }
      throw e;
    }

    append_history({
      resource: "employees",
      record_id: id,
      action: "update",
      summary: `Empleado actualizado: ${updated.full_name}`,
      payload: { before, after: updated },
      actor: actor_from(identity),
    });

    return json({ data: updated });
  } catch (err) {
    return error(
      "validation_error",
      err instanceof Error ? err.message : String(err),
      400,
    );
  }
}

function soft_delete(
  id: string,
  identity: KirletIdentity | null,
): Response {
  const db = get_db();
  const existing = db
    .query(`SELECT * FROM employees WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!existing) return not_found(`/employees/${id}`);
  const before = row_to_employee(existing);
  const updated_at = now_iso();
  db.query(`UPDATE employees SET is_active = 0, updated_at = ? WHERE id = ?`).run(
    updated_at,
    id,
  );
  const after = { ...before, is_active: 0, updated_at };
  append_history({
    resource: "employees",
    record_id: id,
    action: "delete",
    summary: `Empleado desactivado: ${before.full_name}`,
    payload: { before, after },
    actor: actor_from(identity),
  });
  return json({ data: after });
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion EMPLOYEES ROUTES
// (o==================================================================o)
