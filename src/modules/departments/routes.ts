// (o==================================================================o)
//   #region DEPARTMENTS ROUTES
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
} from "../../http.ts";
import { require_access, actor_from } from "../../auth.ts";
import { append_history } from "../../history.ts";
import {
  normalize_department_input,
  type Department,
} from "./schema.ts";

export async function handle_departments(
  req: Request,
  path: string,
  url: URL,
  identity: KirletIdentity | null,
): Promise<Response | null> {
  const one = path.match(/^\/departments\/([^/]+)$/);
  if (one) {
    const id = one[1]!;
    if (req.method === "GET") {
      const denied = require_access(identity, "departments", "read");
      if (denied) return denied;
      return get_one(id);
    }
    if (req.method === "PATCH") {
      const denied = require_access(identity, "departments", "update");
      if (denied) return denied;
      return patch_one(req, id, identity);
    }
    if (req.method === "DELETE") {
      const denied = require_access(identity, "departments", "delete");
      if (denied) return denied;
      return remove(id, identity);
    }
    return method_not_allowed(["GET", "PATCH", "DELETE"]);
  }

  if (path === "/departments") {
    if (req.method === "GET") {
      const denied = require_access(identity, "departments", "read");
      if (denied) return denied;
      return list(url);
    }
    if (req.method === "POST") {
      const denied = require_access(identity, "departments", "create");
      if (denied) return denied;
      return create(req, identity);
    }
    return method_not_allowed(["GET", "POST"]);
  }

  return null;
}

function row(r: Record<string, unknown>): Department {
  return {
    id: String(r.id),
    name: String(r.name),
    description: (r.description as string) ?? null,
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
        `SELECT id, name FROM departments WHERE is_active = 1 ORDER BY name ASC`,
      )
      .all() as Array<{ id: string; name: string }>;
    return json({
      data: rows.map((r) => ({ value: r.id, label: r.name })),
    });
  }

  const q = parse_list_query(url.searchParams);
  const include_inactive = url.searchParams.get("include_inactive") === "1";
  const where: string[] = [];
  const params: unknown[] = [];
  if (!include_inactive) where.push("is_active = 1");
  if (q.q) {
    where.push(`(name LIKE ? OR description LIKE ?)`);
    const like = `%${q.q}%`;
    params.push(like, like);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (
    db
      .query(`SELECT COUNT(*) AS c FROM departments ${clause}`)
      .get(...params) as { c: number }
  ).c;
  const rows = db
    .query(
      `SELECT * FROM departments ${clause} ORDER BY name ASC LIMIT ? OFFSET ?`,
    )
    .all(...params, q.take, q.skip) as Array<Record<string, unknown>>;
  return json({ data: rows.map(row), total });
}

function get_one(id: string): Response {
  const db = get_db();
  const r = db
    .query(`SELECT * FROM departments WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!r) return not_found(`/departments/${id}`);
  return json({ data: row(r) });
}

async function create(
  req: Request,
  identity: KirletIdentity | null,
): Promise<Response> {
  try {
    const input = normalize_department_input(await req.json());
    const db = get_db();
    const id = new_id("dep");
    const iso = now_iso();
    const rec: Department = {
      id,
      name: input.name!,
      description: input.description ?? null,
      is_active: 1,
      created_at: iso,
      updated_at: iso,
    };
    try {
      db.query(
        `INSERT INTO departments (id, name, description, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        rec.id,
        rec.name,
        rec.description,
        rec.is_active,
        rec.created_at,
        rec.updated_at,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("UNIQUE") || msg.includes("unique")) {
        return error("conflict", "El departamento ya existe", 409);
      }
      throw e;
    }
    append_history({
      resource: "departments",
      record_id: id,
      action: "create",
      summary: `Departamento creado: ${rec.name}`,
      payload: { after: rec },
      actor: actor_from(identity),
    });
    return json({ data: rec }, 201);
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
      .query(`SELECT * FROM departments WHERE id = ?`)
      .get(id) as Record<string, unknown> | null;
    if (!existing) return not_found(`/departments/${id}`);
    const before = row(existing);
    const input = normalize_department_input(await req.json(), true);
    const updated: Department = {
      ...before,
      name: input.name ?? before.name,
      description:
        input.description !== undefined
          ? input.description
          : before.description,
      is_active:
        input.is_active !== undefined ? input.is_active : before.is_active,
      updated_at: now_iso(),
    };
    db.query(
      `UPDATE departments SET name=?, description=?, is_active=?, updated_at=? WHERE id=?`,
    ).run(
      updated.name,
      updated.description,
      updated.is_active,
      updated.updated_at,
      id,
    );
    append_history({
      resource: "departments",
      record_id: id,
      action: "update",
      summary: `Departamento actualizado: ${updated.name}`,
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

function remove(id: string, identity: KirletIdentity | null): Response {
  const db = get_db();
  const existing = db
    .query(`SELECT * FROM departments WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!existing) return not_found(`/departments/${id}`);
  const before = row(existing);

  const active_emps = (
    db
      .query(
        `SELECT COUNT(*) AS c FROM employees WHERE department_id = ? AND is_active = 1`,
      )
      .get(id) as { c: number }
  ).c;
  if (active_emps > 0) {
    return error(
      "conflict",
      `No se puede eliminar: hay ${active_emps} empleado(s) activo(s) en el departamento`,
      409,
    );
  }

  db.query(`DELETE FROM departments WHERE id = ?`).run(id);
  append_history({
    resource: "departments",
    record_id: id,
    action: "delete",
    summary: `Departamento eliminado: ${before.name}`,
    payload: { before },
    actor: actor_from(identity),
  });
  return json({ data: before });
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DEPARTMENTS ROUTES
// (o==================================================================o)
