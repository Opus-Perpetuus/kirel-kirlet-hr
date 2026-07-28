// (o==================================================================o)
//   #region LEAVE ROUTES
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
  normalize_leave_type_input,
  normalize_leave_request_input,
  compute_days,
  type LeaveType,
  type LeaveRequest,
  type LeaveBalance,
} from "./schema.ts";

export async function handle_leave(
  req: Request,
  path: string,
  url: URL,
  identity: KirletIdentity | null,
): Promise<Response | null> {
  // leave-types
  if (path.startsWith("/leave-types")) {
    return handle_leave_types(req, path, url, identity);
  }
  // leave-balances
  if (path.startsWith("/leave-balances")) {
    return handle_leave_balances(req, path, url, identity);
  }
  // leave-requests (+ approve/reject)
  if (path.startsWith("/leave-requests")) {
    return handle_leave_requests(req, path, url, identity);
  }
  return null;
}

// --- leave-types ---

async function handle_leave_types(
  req: Request,
  path: string,
  url: URL,
  identity: KirletIdentity | null,
): Promise<Response | null> {
  const one = path.match(/^\/leave-types\/([^/]+)$/);
  if (one) {
    const id = one[1]!;
    if (req.method === "GET") {
      const denied = require_access(identity, "leave", "read");
      if (denied) return denied;
      const r = get_db()
        .query(`SELECT * FROM leave_types WHERE id = ?`)
        .get(id) as Record<string, unknown> | null;
      if (!r) return not_found(path);
      return json({ data: map_type(r) });
    }
    if (req.method === "PATCH") {
      const denied = require_access(identity, "leave", "update");
      if (denied) return denied;
      return patch_type(req, id, identity);
    }
    if (req.method === "DELETE") {
      const denied = require_access(identity, "leave", "delete");
      if (denied) return denied;
      return delete_type(id, identity);
    }
    return method_not_allowed(["GET", "PATCH", "DELETE"]);
  }

  if (path === "/leave-types") {
    if (req.method === "GET") {
      const denied = require_access(identity, "leave", "read");
      if (denied) return denied;
      return list_types(url);
    }
    if (req.method === "POST") {
      const denied = require_access(identity, "leave", "create");
      if (denied) return denied;
      return create_type(req, identity);
    }
    return method_not_allowed(["GET", "POST"]);
  }
  return null;
}

function map_type(r: Record<string, unknown>): LeaveType {
  return {
    id: String(r.id),
    name: String(r.name),
    paid: Number(r.paid),
    max_days_per_year:
      r.max_days_per_year == null ? null : Number(r.max_days_per_year),
    is_active: Number(r.is_active),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

function list_types(url: URL): Response {
  const db = get_db();
  if (url.searchParams.get("as") === "options") {
    const rows = db
      .query(
        `SELECT id, name FROM leave_types WHERE is_active = 1 ORDER BY name ASC`,
      )
      .all() as Array<{ id: string; name: string }>;
    return json({
      data: rows.map((r) => ({ value: r.id, label: r.name })),
    });
  }
  const q = parse_list_query(url.searchParams);
  const rows = db
    .query(
      `SELECT * FROM leave_types ORDER BY name ASC LIMIT ? OFFSET ?`,
    )
    .all(q.take, q.skip) as Array<Record<string, unknown>>;
  const total = (
    db.query(`SELECT COUNT(*) AS c FROM leave_types`).get() as { c: number }
  ).c;
  return json({ data: rows.map(map_type), total });
}

async function create_type(
  req: Request,
  identity: KirletIdentity | null,
): Promise<Response> {
  try {
    const input = normalize_leave_type_input(await req.json());
    const db = get_db();
    const id = new_id("lt");
    const iso = now_iso();
    const rec: LeaveType = {
      id,
      name: input.name!,
      paid: input.paid ?? 1,
      max_days_per_year: input.max_days_per_year ?? null,
      is_active: 1,
      created_at: iso,
      updated_at: iso,
    };
    db.query(
      `INSERT INTO leave_types (id, name, paid, max_days_per_year, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      rec.id,
      rec.name,
      rec.paid,
      rec.max_days_per_year,
      rec.is_active,
      rec.created_at,
      rec.updated_at,
    );
    append_history({
      resource: "leave_types",
      record_id: id,
      action: "create",
      summary: `Tipo de ausencia: ${rec.name}`,
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

async function patch_type(
  req: Request,
  id: string,
  identity: KirletIdentity | null,
): Promise<Response> {
  try {
    const db = get_db();
    const existing = db
      .query(`SELECT * FROM leave_types WHERE id = ?`)
      .get(id) as Record<string, unknown> | null;
    if (!existing) return not_found(`/leave-types/${id}`);
    const before = map_type(existing);
    const input = normalize_leave_type_input(await req.json(), true);
    const updated: LeaveType = {
      ...before,
      name: input.name ?? before.name,
      paid: input.paid !== undefined ? input.paid : before.paid,
      max_days_per_year:
        input.max_days_per_year !== undefined
          ? input.max_days_per_year
          : before.max_days_per_year,
      is_active:
        input.is_active !== undefined ? input.is_active : before.is_active,
      updated_at: now_iso(),
    };
    db.query(
      `UPDATE leave_types SET name=?, paid=?, max_days_per_year=?, is_active=?, updated_at=? WHERE id=?`,
    ).run(
      updated.name,
      updated.paid,
      updated.max_days_per_year,
      updated.is_active,
      updated.updated_at,
      id,
    );
    append_history({
      resource: "leave_types",
      record_id: id,
      action: "update",
      summary: `Tipo de ausencia actualizado: ${updated.name}`,
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

function delete_type(
  id: string,
  identity: KirletIdentity | null,
): Response {
  const db = get_db();
  const existing = db
    .query(`SELECT * FROM leave_types WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!existing) return not_found(`/leave-types/${id}`);
  const before = map_type(existing);
  db.query(`UPDATE leave_types SET is_active = 0, updated_at = ? WHERE id = ?`).run(
    now_iso(),
    id,
  );
  append_history({
    resource: "leave_types",
    record_id: id,
    action: "delete",
    summary: `Tipo de ausencia desactivado: ${before.name}`,
    payload: { before },
    actor: actor_from(identity),
  });
  return json({ data: { ...before, is_active: 0 } });
}

// --- leave-requests ---

async function handle_leave_requests(
  req: Request,
  path: string,
  url: URL,
  identity: KirletIdentity | null,
): Promise<Response | null> {
  const decide = path.match(
    /^\/leave-requests\/([^/]+)\/(approve|reject|cancel)$/,
  );
  if (decide) {
    if (req.method !== "POST") return method_not_allowed(["POST"]);
    const denied = require_access(identity, "leave", "update");
    if (denied) return denied;
    return decide_request(req, decide[1]!, decide[2] as "approve" | "reject" | "cancel", identity);
  }

  const one = path.match(/^\/leave-requests\/([^/]+)$/);
  if (one) {
    const id = one[1]!;
    if (req.method === "GET") {
      const denied = require_access(identity, "leave", "read");
      if (denied) return denied;
      const r = get_db()
        .query(`SELECT * FROM leave_requests WHERE id = ?`)
        .get(id) as Record<string, unknown> | null;
      if (!r) return not_found(path);
      return json({ data: map_request(r) });
    }
    if (req.method === "PATCH") {
      const denied = require_access(identity, "leave", "update");
      if (denied) return denied;
      return patch_request(req, id, identity);
    }
    if (req.method === "DELETE") {
      const denied = require_access(identity, "leave", "delete");
      if (denied) return denied;
      return delete_request(id, identity);
    }
    return method_not_allowed(["GET", "PATCH", "DELETE"]);
  }

  if (path === "/leave-requests") {
    if (req.method === "GET") {
      const denied = require_access(identity, "leave", "read");
      if (denied) return denied;
      return list_requests(url);
    }
    if (req.method === "POST") {
      const denied = require_access(identity, "leave", "create");
      if (denied) return denied;
      return create_request(req, identity);
    }
    return method_not_allowed(["GET", "POST"]);
  }
  return null;
}

function map_request(r: Record<string, unknown>): LeaveRequest {
  return {
    id: String(r.id),
    employee_id: String(r.employee_id),
    leave_type_id: String(r.leave_type_id),
    start_date: String(r.start_date),
    end_date: String(r.end_date),
    days: Number(r.days),
    reason: (r.reason as string) ?? null,
    status: String(r.status),
    decided_by: (r.decided_by as string) ?? null,
    decided_at: (r.decided_at as string) ?? null,
    decision_note: (r.decision_note as string) ?? null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

function list_requests(url: URL): Response {
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
    where.push("status = ?");
    params.push(status);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (
    db
      .query(`SELECT COUNT(*) AS c FROM leave_requests ${clause}`)
      .get(...params) as { c: number }
  ).c;
  const rows = db
    .query(
      `SELECT * FROM leave_requests ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, q.take, q.skip) as Array<Record<string, unknown>>;
  return json({ data: rows.map(map_request), total });
}

async function create_request(
  req: Request,
  identity: KirletIdentity | null,
): Promise<Response> {
  try {
    const input = normalize_leave_request_input(await req.json());
    const db = get_db();
    const days =
      input.days ??
      compute_days(input.start_date!, input.end_date!);
    const id = new_id("lr");
    const iso = now_iso();
    const rec: LeaveRequest = {
      id,
      employee_id: input.employee_id!,
      leave_type_id: input.leave_type_id!,
      start_date: input.start_date!,
      end_date: input.end_date!,
      days,
      reason: input.reason ?? null,
      status: "pendiente",
      decided_by: null,
      decided_at: null,
      decision_note: null,
      created_at: iso,
      updated_at: iso,
    };
    db.query(
      `INSERT INTO leave_requests (
        id, employee_id, leave_type_id, start_date, end_date, days, reason,
        status, decided_by, decided_at, decision_note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      rec.id,
      rec.employee_id,
      rec.leave_type_id,
      rec.start_date,
      rec.end_date,
      rec.days,
      rec.reason,
      rec.status,
      rec.decided_by,
      rec.decided_at,
      rec.decision_note,
      rec.created_at,
      rec.updated_at,
    );
    append_history({
      resource: "leave_requests",
      record_id: id,
      action: "create",
      summary: `Solicitud de ausencia creada`,
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

async function patch_request(
  req: Request,
  id: string,
  identity: KirletIdentity | null,
): Promise<Response> {
  try {
    const db = get_db();
    const existing = db
      .query(`SELECT * FROM leave_requests WHERE id = ?`)
      .get(id) as Record<string, unknown> | null;
    if (!existing) return not_found(`/leave-requests/${id}`);
    const before = map_request(existing);
    if (before.status !== "pendiente") {
      return error(
        "conflict",
        "Solo se pueden editar solicitudes en estado pendiente",
        409,
      );
    }
    const input = normalize_leave_request_input(await req.json(), true);
    const start = input.start_date ?? before.start_date;
    const end = input.end_date ?? before.end_date;
    const days =
      input.days ??
      (input.start_date || input.end_date
        ? compute_days(start, end)
        : before.days);
    const updated: LeaveRequest = {
      ...before,
      employee_id: input.employee_id ?? before.employee_id,
      leave_type_id: input.leave_type_id ?? before.leave_type_id,
      start_date: start,
      end_date: end,
      days,
      reason: input.reason !== undefined ? input.reason : before.reason,
      updated_at: now_iso(),
    };
    db.query(
      `UPDATE leave_requests SET
        employee_id=?, leave_type_id=?, start_date=?, end_date=?, days=?, reason=?, updated_at=?
       WHERE id=?`,
    ).run(
      updated.employee_id,
      updated.leave_type_id,
      updated.start_date,
      updated.end_date,
      updated.days,
      updated.reason,
      updated.updated_at,
      id,
    );
    append_history({
      resource: "leave_requests",
      record_id: id,
      action: "update",
      summary: `Solicitud de ausencia actualizada`,
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

function delete_request(
  id: string,
  identity: KirletIdentity | null,
): Response {
  const db = get_db();
  const existing = db
    .query(`SELECT * FROM leave_requests WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!existing) return not_found(`/leave-requests/${id}`);
  const before = map_request(existing);
  if (before.status !== "pendiente") {
    return error(
      "conflict",
      "Solo se pueden eliminar solicitudes en estado pendiente",
      409,
    );
  }
  db.query(`DELETE FROM leave_requests WHERE id = ?`).run(id);
  append_history({
    resource: "leave_requests",
    record_id: id,
    action: "delete",
    summary: `Solicitud de ausencia eliminada`,
    payload: { before },
    actor: actor_from(identity),
  });
  return json({ data: before });
}

async function decide_request(
  req: Request,
  id: string,
  action: "approve" | "reject" | "cancel",
  identity: KirletIdentity | null,
): Promise<Response> {
  const db = get_db();
  const existing = db
    .query(`SELECT * FROM leave_requests WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!existing) return not_found(`/leave-requests/${id}`);
  const before = map_request(existing);

  if (before.status !== "pendiente") {
    return error(
      "conflict",
      `Transición inválida: estado actual es "${before.status}"`,
      409,
    );
  }

  let body: Record<string, unknown> = {};
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("json") && req.method === "POST") {
      const text = await req.text();
      if (text.trim()) body = JSON.parse(text) as Record<string, unknown>;
    }
  } catch {
    /* ignore empty body */
  }

  const note =
    body.decision_note != null ? String(body.decision_note) : null;
  const iso = now_iso();
  const actor = actor_from(identity);

  if (action === "approve") {
    // Deduct balance
    const year = Number(before.start_date.slice(0, 4));
    ensure_balance(before.employee_id, before.leave_type_id, year);
    const bal = db
      .query(
        `SELECT * FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
      )
      .get(before.employee_id, before.leave_type_id, year) as {
      id: string;
      entitled_days: number;
      used_days: number;
    } | null;

    if (bal) {
      const remaining = bal.entitled_days - bal.used_days;
      if (bal.entitled_days > 0 && before.days > remaining) {
        return error(
          "conflict",
          `Saldo insuficiente: quedan ${remaining} día(s)`,
          409,
        );
      }
      db.query(
        `UPDATE leave_balances SET used_days = used_days + ? WHERE id = ?`,
      ).run(before.days, bal.id);
    }

    const updated: LeaveRequest = {
      ...before,
      status: "aprobada",
      decided_by: actor,
      decided_at: iso,
      decision_note: note,
      updated_at: iso,
    };
    db.query(
      `UPDATE leave_requests SET status=?, decided_by=?, decided_at=?, decision_note=?, updated_at=? WHERE id=?`,
    ).run(
      updated.status,
      updated.decided_by,
      updated.decided_at,
      updated.decision_note,
      updated.updated_at,
      id,
    );
    append_history({
      resource: "leave_requests",
      record_id: id,
      action: "approve",
      summary: `Solicitud aprobada`,
      payload: { before, after: updated },
      actor,
    });
    return json({ data: updated });
  }

  if (action === "reject") {
    const updated: LeaveRequest = {
      ...before,
      status: "rechazada",
      decided_by: actor,
      decided_at: iso,
      decision_note: note,
      updated_at: iso,
    };
    db.query(
      `UPDATE leave_requests SET status=?, decided_by=?, decided_at=?, decision_note=?, updated_at=? WHERE id=?`,
    ).run(
      updated.status,
      updated.decided_by,
      updated.decided_at,
      updated.decision_note,
      updated.updated_at,
      id,
    );
    append_history({
      resource: "leave_requests",
      record_id: id,
      action: "reject",
      summary: `Solicitud rechazada`,
      payload: { before, after: updated },
      actor,
    });
    return json({ data: updated });
  }

  // cancel
  const updated: LeaveRequest = {
    ...before,
    status: "cancelada",
    decided_by: actor,
    decided_at: iso,
    decision_note: note,
    updated_at: iso,
  };
  db.query(
    `UPDATE leave_requests SET status=?, decided_by=?, decided_at=?, decision_note=?, updated_at=? WHERE id=?`,
  ).run(
    updated.status,
    updated.decided_by,
    updated.decided_at,
    updated.decision_note,
    updated.updated_at,
    id,
  );
  append_history({
    resource: "leave_requests",
    record_id: id,
    action: "cancel",
    summary: `Solicitud cancelada`,
    payload: { before, after: updated },
    actor,
  });
  return json({ data: updated });
}

function ensure_balance(
  employee_id: string,
  leave_type_id: string,
  year: number,
): void {
  const db = get_db();
  const existing = db
    .query(
      `SELECT id FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
    )
    .get(employee_id, leave_type_id, year);
  if (existing) return;

  const lt = db
    .query(`SELECT max_days_per_year FROM leave_types WHERE id = ?`)
    .get(leave_type_id) as { max_days_per_year: number | null } | null;
  const entitled = lt?.max_days_per_year ?? 0;
  db.query(
    `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, entitled_days, used_days)
     VALUES (?, ?, ?, ?, ?, 0)`,
  ).run(new_id("lb"), employee_id, leave_type_id, year, entitled);
}

// --- leave-balances ---

async function handle_leave_balances(
  req: Request,
  path: string,
  url: URL,
  identity: KirletIdentity | null,
): Promise<Response | null> {
  if (path === "/leave-balances") {
    if (req.method === "GET") {
      const denied = require_access(identity, "leave", "read");
      if (denied) return denied;
      return list_balances(url);
    }
    if (req.method === "POST") {
      const denied = require_access(identity, "leave", "create");
      if (denied) return denied;
      return upsert_balance(req, identity);
    }
    return method_not_allowed(["GET", "POST"]);
  }

  const one = path.match(/^\/leave-balances\/([^/]+)$/);
  if (one) {
    if (req.method === "GET") {
      const denied = require_access(identity, "leave", "read");
      if (denied) return denied;
      const r = get_db()
        .query(`SELECT * FROM leave_balances WHERE id = ?`)
        .get(one[1]!) as Record<string, unknown> | null;
      if (!r) return not_found(path);
      return json({ data: map_balance(r) });
    }
    if (req.method === "PATCH") {
      const denied = require_access(identity, "leave", "update");
      if (denied) return denied;
      return patch_balance(req, one[1]!, identity);
    }
    return method_not_allowed(["GET", "PATCH"]);
  }
  return null;
}

function map_balance(r: Record<string, unknown>): LeaveBalance {
  return {
    id: String(r.id),
    employee_id: String(r.employee_id),
    leave_type_id: String(r.leave_type_id),
    year: Number(r.year),
    entitled_days: Number(r.entitled_days),
    used_days: Number(r.used_days),
  };
}

function list_balances(url: URL): Response {
  const db = get_db();
  const where: string[] = [];
  const params: unknown[] = [];
  const employee_id = url.searchParams.get("employee_id");
  if (employee_id) {
    where.push("employee_id = ?");
    params.push(employee_id);
  }
  const year = url.searchParams.get("year");
  if (year) {
    where.push("year = ?");
    params.push(Number(year));
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .query(`SELECT * FROM leave_balances ${clause} ORDER BY year DESC`)
    .all(...params) as Array<Record<string, unknown>>;
  return json({ data: rows.map(map_balance), total: rows.length });
}

async function upsert_balance(
  req: Request,
  identity: KirletIdentity | null,
): Promise<Response> {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const employee_id = String(body.employee_id ?? "").trim();
    const leave_type_id = String(body.leave_type_id ?? "").trim();
    const year = Number(body.year ?? new Date().getFullYear());
    const entitled_days = Number(body.entitled_days ?? 0);
    if (!employee_id || !leave_type_id) {
      return error(
        "validation_error",
        "employee_id y leave_type_id son requeridos",
        400,
      );
    }
    const db = get_db();
    const existing = db
      .query(
        `SELECT * FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
      )
      .get(employee_id, leave_type_id, year) as Record<string, unknown> | null;

    if (existing) {
      db.query(
        `UPDATE leave_balances SET entitled_days = ? WHERE id = ?`,
      ).run(entitled_days, existing.id);
      const updated = map_balance({ ...existing, entitled_days });
      append_history({
        resource: "leave_balances",
        record_id: updated.id,
        action: "update",
        summary: `Saldo actualizado`,
        payload: { after: updated },
        actor: actor_from(identity),
      });
      return json({ data: updated });
    }

    const id = new_id("lb");
    const rec: LeaveBalance = {
      id,
      employee_id,
      leave_type_id,
      year,
      entitled_days,
      used_days: 0,
    };
    db.query(
      `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, entitled_days, used_days)
       VALUES (?, ?, ?, ?, ?, 0)`,
    ).run(id, employee_id, leave_type_id, year, entitled_days);
    append_history({
      resource: "leave_balances",
      record_id: id,
      action: "create",
      summary: `Saldo creado`,
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

async function patch_balance(
  req: Request,
  id: string,
  identity: KirletIdentity | null,
): Promise<Response> {
  try {
    const db = get_db();
    const existing = db
      .query(`SELECT * FROM leave_balances WHERE id = ?`)
      .get(id) as Record<string, unknown> | null;
    if (!existing) return not_found(`/leave-balances/${id}`);
    const before = map_balance(existing);
    const body = (await req.json()) as Record<string, unknown>;
    const entitled_days =
      body.entitled_days !== undefined
        ? Number(body.entitled_days)
        : before.entitled_days;
    const used_days =
      body.used_days !== undefined ? Number(body.used_days) : before.used_days;
    db.query(
      `UPDATE leave_balances SET entitled_days = ?, used_days = ? WHERE id = ?`,
    ).run(entitled_days, used_days, id);
    const updated = { ...before, entitled_days, used_days };
    append_history({
      resource: "leave_balances",
      record_id: id,
      action: "update",
      summary: `Saldo actualizado`,
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

// (o-----------------------------------------------------------/\-----o)
//   #endregion LEAVE ROUTES
// (o==================================================================o)
