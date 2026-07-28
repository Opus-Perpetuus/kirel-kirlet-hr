// (o==================================================================o)
//   #region CONTRACTS ROUTES
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
  normalize_contract_input,
  effective_status,
  type Contract,
} from "./schema.ts";

export async function handle_contracts(
  req: Request,
  path: string,
  url: URL,
  identity: KirletIdentity | null,
): Promise<Response | null> {
  const one = path.match(/^\/contracts\/([^/]+)$/);
  if (one) {
    const id = one[1]!;
    if (req.method === "GET") {
      const denied = require_access(identity, "contracts", "read");
      if (denied) return denied;
      return get_one(id);
    }
    if (req.method === "PATCH") {
      const denied = require_access(identity, "contracts", "update");
      if (denied) return denied;
      return patch_one(req, id, identity);
    }
    if (req.method === "DELETE") {
      const denied = require_access(identity, "contracts", "delete");
      if (denied) return denied;
      return remove(id, identity);
    }
    return method_not_allowed(["GET", "PATCH", "DELETE"]);
  }

  if (path === "/contracts") {
    if (req.method === "GET") {
      const denied = require_access(identity, "contracts", "read");
      if (denied) return denied;
      return list(url);
    }
    if (req.method === "POST") {
      const denied = require_access(identity, "contracts", "create");
      if (denied) return denied;
      return create(req, identity);
    }
    return method_not_allowed(["GET", "POST"]);
  }

  return null;
}

function row(r: Record<string, unknown>): Contract {
  const status = effective_status(
    String(r.status),
    (r.end_date as string) ?? null,
  );
  return {
    id: String(r.id),
    employee_id: String(r.employee_id),
    type: String(r.type),
    start_date: String(r.start_date),
    end_date: (r.end_date as string) ?? null,
    salary: Number(r.salary),
    currency: String(r.currency ?? "MXN"),
    schedule: String(r.schedule ?? "completa"),
    status,
    notes: (r.notes as string) ?? null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

/** Persist vencido when end_date already passed. */
function sync_vencido(id: string, status: string, end_date: string | null): void {
  if (status === "activo" && end_date && end_date < today_iso()) {
    get_db()
      .query(`UPDATE contracts SET status = 'vencido', updated_at = ? WHERE id = ?`)
      .run(now_iso(), id);
  }
}

function list(url: URL): Response {
  const db = get_db();
  const q = parse_list_query(url.searchParams);
  const where: string[] = [];
  const params: unknown[] = [];

  const employee_id = url.searchParams.get("employee_id");
  if (employee_id) {
    where.push("employee_id = ?");
    params.push(employee_id);
  }
  const status = url.searchParams.get("status");
  if (status) {
    // Effective status: treat activo with past end_date as vencido
    if (status === "vencido") {
      where.push(
        `(status = 'vencido' OR (status = 'activo' AND end_date IS NOT NULL AND end_date < date('now')))`,
      );
    } else if (status === "activo") {
      where.push(
        `status = 'activo' AND (end_date IS NULL OR end_date >= date('now'))`,
      );
    } else {
      where.push("status = ?");
      params.push(status);
    }
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (
    db
      .query(`SELECT COUNT(*) AS c FROM contracts ${clause}`)
      .get(...params) as { c: number }
  ).c;
  const rows = db
    .query(
      `SELECT * FROM contracts ${clause} ORDER BY start_date DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, q.take, q.skip) as Array<Record<string, unknown>>;

  const data = rows.map((r) => {
    const c = row(r);
    if (c.status === "vencido" && String(r.status) === "activo") {
      sync_vencido(c.id, String(r.status), c.end_date);
    }
    return c;
  });

  return json({ data, total });
}

function get_one(id: string): Response {
  const db = get_db();
  const r = db
    .query(`SELECT * FROM contracts WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!r) return not_found(`/contracts/${id}`);
  const c = row(r);
  if (c.status === "vencido" && String(r.status) === "activo") {
    sync_vencido(c.id, String(r.status), c.end_date);
  }
  return json({ data: c });
}

async function create(
  req: Request,
  identity: KirletIdentity | null,
): Promise<Response> {
  try {
    const input = normalize_contract_input(await req.json());
    const db = get_db();
    const emp = db
      .query(`SELECT id FROM employees WHERE id = ?`)
      .get(input.employee_id!) as { id: string } | null;
    if (!emp) {
      return error("validation_error", "employee_id no existe", 400);
    }

    let status = input.status ?? "activo";
    status = effective_status(status, input.end_date ?? null);

    const id = new_id("ctr");
    const iso = now_iso();
    const rec: Contract = {
      id,
      employee_id: input.employee_id!,
      type: input.type!,
      start_date: input.start_date!,
      end_date: input.end_date ?? null,
      salary: input.salary ?? 0,
      currency: input.currency ?? "MXN",
      schedule: input.schedule ?? "completa",
      status,
      notes: input.notes ?? null,
      created_at: iso,
      updated_at: iso,
    };

    db.query(
      `INSERT INTO contracts (
        id, employee_id, type, start_date, end_date, salary, currency,
        schedule, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      rec.id,
      rec.employee_id,
      rec.type,
      rec.start_date,
      rec.end_date,
      rec.salary,
      rec.currency,
      rec.schedule,
      rec.status,
      rec.notes,
      rec.created_at,
      rec.updated_at,
    );

    append_history({
      resource: "contracts",
      record_id: id,
      action: "create",
      summary: `Contrato creado para ${rec.employee_id}`,
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
      .query(`SELECT * FROM contracts WHERE id = ?`)
      .get(id) as Record<string, unknown> | null;
    if (!existing) return not_found(`/contracts/${id}`);
    const before = row(existing);
    const input = normalize_contract_input(await req.json(), true);

    let status =
      input.status !== undefined ? input.status : before.status;
    const end_date =
      input.end_date !== undefined ? input.end_date : before.end_date;
    status = effective_status(status, end_date);

    const updated: Contract = {
      ...before,
      employee_id: input.employee_id ?? before.employee_id,
      type: input.type ?? before.type,
      start_date: input.start_date ?? before.start_date,
      end_date,
      salary: input.salary !== undefined ? input.salary : before.salary,
      currency: input.currency ?? before.currency,
      schedule: input.schedule ?? before.schedule,
      status,
      notes: input.notes !== undefined ? input.notes : before.notes,
      updated_at: now_iso(),
    };

    db.query(
      `UPDATE contracts SET
        employee_id=?, type=?, start_date=?, end_date=?, salary=?, currency=?,
        schedule=?, status=?, notes=?, updated_at=?
       WHERE id=?`,
    ).run(
      updated.employee_id,
      updated.type,
      updated.start_date,
      updated.end_date,
      updated.salary,
      updated.currency,
      updated.schedule,
      updated.status,
      updated.notes,
      updated.updated_at,
      id,
    );

    append_history({
      resource: "contracts",
      record_id: id,
      action: "update",
      summary: `Contrato actualizado: ${id}`,
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
    .query(`SELECT * FROM contracts WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!existing) return not_found(`/contracts/${id}`);
  const before = row(existing);
  db.query(`DELETE FROM contracts WHERE id = ?`).run(id);
  append_history({
    resource: "contracts",
    record_id: id,
    action: "delete",
    summary: `Contrato eliminado: ${id}`,
    payload: { before },
    actor: actor_from(identity),
  });
  return json({ data: before });
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion CONTRACTS ROUTES
// (o==================================================================o)
