// (o==================================================================o)
//   #region INCIDENTS ROUTES
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
  can_transition_incident_status,
  normalize_incident_input,
  type Incident,
  type IncidentStatus,
} from "./schema.ts";

const SORTABLE = new Set([
  "folio",
  "title",
  "type",
  "severity",
  "status",
  "occurred_at",
  "created_at",
  "updated_at",
]);

export async function handle_incidents(
  req: Request,
  path: string,
  url: URL,
  identity: KirletIdentity | null,
): Promise<Response | null> {
  // Status actions
  const action = path.match(
    /^\/incidents\/([^/]+)\/(review|start|resolve|close|cancel|reopen)$/,
  );
  if (action) {
    if (req.method !== "POST") return method_not_allowed(["POST"]);
    const denied = require_access(identity, "incidents", "update");
    if (denied) return denied;
    return transition(req, action[1]!, action[2]!, identity);
  }

  const one = path.match(/^\/incidents\/([^/]+)$/);
  if (one) {
    const id = one[1]!;
    if (req.method === "GET") {
      const denied = require_access(identity, "incidents", "read");
      if (denied) return denied;
      return get_one(id);
    }
    if (req.method === "PATCH") {
      const denied = require_access(identity, "incidents", "update");
      if (denied) return denied;
      return patch_one(req, id, identity);
    }
    if (req.method === "DELETE") {
      const denied = require_access(identity, "incidents", "delete");
      if (denied) return denied;
      return soft_delete(id, identity);
    }
    return method_not_allowed(["GET", "PATCH", "DELETE"]);
  }

  if (path === "/incidents") {
    if (req.method === "GET") {
      const denied = require_access(identity, "incidents", "read");
      if (denied) return denied;
      return list(url);
    }
    if (req.method === "POST") {
      const denied = require_access(identity, "incidents", "create");
      if (denied) return denied;
      return create(req, identity);
    }
    return method_not_allowed(["GET", "POST"]);
  }

  return null;
}

function map_row(r: Record<string, unknown>): Incident {
  return {
    id: String(r.id),
    folio: String(r.folio),
    title: String(r.title),
    description: (r.description as string) ?? null,
    employee_id: (r.employee_id as string) ?? null,
    type: r.type as Incident["type"],
    severity: r.severity as Incident["severity"],
    status: r.status as Incident["status"],
    occurred_at: (r.occurred_at as string) ?? null,
    location: (r.location as string) ?? null,
    reported_by: (r.reported_by as string) ?? null,
    assigned_to: (r.assigned_to as string) ?? null,
    resolution_note: (r.resolution_note as string) ?? null,
    closed_at: (r.closed_at as string) ?? null,
    is_active: Number(r.is_active),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

function next_folio(db: ReturnType<typeof get_db>): string {
  const year = new Date().getFullYear();
  const prefix = `INC-${year}-`;
  const row = db
    .query(
      `SELECT folio FROM incidents WHERE folio LIKE ? ORDER BY folio DESC LIMIT 1`,
    )
    .get(`${prefix}%`) as { folio: string } | null;
  let n = 1;
  if (row?.folio) {
    const m = row.folio.match(/-(\d+)$/);
    if (m) n = Number(m[1]) + 1;
  }
  return `${prefix}${String(n).padStart(4, "0")}`;
}

function ensure_employee(
  db: ReturnType<typeof get_db>,
  employee_id: string | null | undefined,
): Response | null {
  if (!employee_id) return null;
  const exists = db
    .query(`SELECT id FROM employees WHERE id = ?`)
    .get(employee_id) as { id: string } | null;
  if (!exists) {
    return error("validation_error", "employee_id no existe", 400);
  }
  return null;
}

function list(url: URL): Response {
  const db = get_db();
  const q = parse_list_query(url.searchParams);
  const include_inactive = url.searchParams.get("include_inactive") === "1";
  const status = url.searchParams.get("status")?.trim();
  const type = url.searchParams.get("type")?.trim();
  const severity = url.searchParams.get("severity")?.trim();
  const employee_id = url.searchParams.get("employee_id")?.trim();

  const where: string[] = [];
  const params: unknown[] = [];

  if (!include_inactive) where.push("is_active = 1");
  if (status) {
    where.push("status = ?");
    params.push(status);
  }
  if (type) {
    where.push("type = ?");
    params.push(type);
  }
  if (severity) {
    where.push("severity = ?");
    params.push(severity);
  }
  if (employee_id) {
    where.push("employee_id = ?");
    params.push(employee_id);
  }
  if (q.q) {
    where.push(
      `(title LIKE ? OR folio LIKE ? OR description LIKE ? OR location LIKE ? OR reported_by LIKE ?)`,
    );
    const like = `%${q.q}%`;
    params.push(like, like, like, like, like);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  let order = "ORDER BY created_at DESC";
  if (q.sort) {
    const [col, dir] = q.sort.split(":");
    if (col && SORTABLE.has(col) && (dir === "asc" || dir === "desc")) {
      order = `ORDER BY ${col} ${dir.toUpperCase()}`;
    }
  }

  const total = (
    db
      .query(`SELECT COUNT(*) AS c FROM incidents ${clause}`)
      .get(...params) as { c: number }
  ).c;

  const rows = db
    .query(`SELECT * FROM incidents ${clause} ${order} LIMIT ? OFFSET ?`)
    .all(...params, q.take, q.skip) as Array<Record<string, unknown>>;

  return json({ data: rows.map(map_row), total });
}

function get_one(id: string): Response {
  const row = get_db()
    .query(`SELECT * FROM incidents WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!row) return not_found(`/incidents/${id}`);
  return json({ data: map_row(row) });
}

async function create(
  req: Request,
  identity: KirletIdentity | null,
): Promise<Response> {
  try {
    const input = normalize_incident_input(await req.json()) as {
      title: string;
      description?: string | null;
      employee_id?: string | null;
      type: Incident["type"];
      severity: Incident["severity"];
      status?: IncidentStatus;
      occurred_at?: string | null;
      location?: string | null;
      reported_by?: string | null;
      assigned_to?: string | null;
    };
    const db = get_db();
    const emp_err = ensure_employee(db, input.employee_id);
    if (emp_err) return emp_err;

    const id = new_id("inc");
    const iso = now_iso();
    const folio = next_folio(db);
    const status: IncidentStatus = input.status ?? "abierta";
    const actor = actor_from(identity);

    const row: Incident = {
      id,
      folio,
      title: input.title,
      description: input.description ?? null,
      employee_id: input.employee_id ?? null,
      type: input.type,
      severity: input.severity,
      status,
      occurred_at: input.occurred_at ?? null,
      location: input.location ?? null,
      reported_by: input.reported_by ?? actor,
      assigned_to: input.assigned_to ?? null,
      resolution_note: null,
      closed_at: null,
      is_active: 1,
      created_at: iso,
      updated_at: iso,
    };

    db.query(
      `INSERT INTO incidents (
        id, folio, title, description, employee_id, type, severity, status,
        occurred_at, location, reported_by, assigned_to, resolution_note,
        closed_at, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      row.id,
      row.folio,
      row.title,
      row.description,
      row.employee_id,
      row.type,
      row.severity,
      row.status,
      row.occurred_at,
      row.location,
      row.reported_by,
      row.assigned_to,
      row.resolution_note,
      row.closed_at,
      row.is_active,
      row.created_at,
      row.updated_at,
    );

    append_history({
      resource: "incidents",
      record_id: id,
      action: "create",
      summary: `Incidencia creada: ${row.folio} — ${row.title}`,
      payload: { after: row },
      actor,
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
      .query(`SELECT * FROM incidents WHERE id = ?`)
      .get(id) as Record<string, unknown> | null;
    if (!existing) return not_found(`/incidents/${id}`);
    const before = map_row(existing);
    const input = normalize_incident_input(await req.json(), true);

    if (input.employee_id !== undefined) {
      const emp_err = ensure_employee(db, input.employee_id);
      if (emp_err) return emp_err;
    }

    let status = before.status;
    let closed_at = before.closed_at;
    if (input.status !== undefined && input.status !== before.status) {
      if (!can_transition_incident_status(before.status, input.status)) {
        return error(
          "invalid_transition",
          `No se puede pasar de ${before.status} a ${input.status}`,
          400,
        );
      }
      status = input.status;
      if (status === "cerrada" || status === "cancelada") {
        closed_at = now_iso();
      } else if (before.status === "cerrada" || before.status === "cancelada") {
        closed_at = null;
      }
    }

    const updated: Incident = {
      ...before,
      title: input.title ?? before.title,
      description:
        input.description !== undefined
          ? input.description
          : before.description,
      employee_id:
        input.employee_id !== undefined
          ? input.employee_id
          : before.employee_id,
      type: input.type ?? before.type,
      severity: input.severity ?? before.severity,
      status,
      occurred_at:
        input.occurred_at !== undefined
          ? input.occurred_at
          : before.occurred_at,
      location:
        input.location !== undefined ? input.location : before.location,
      reported_by:
        input.reported_by !== undefined
          ? input.reported_by
          : before.reported_by,
      assigned_to:
        input.assigned_to !== undefined
          ? input.assigned_to
          : before.assigned_to,
      resolution_note:
        input.resolution_note !== undefined
          ? input.resolution_note
          : before.resolution_note,
      closed_at,
      updated_at: now_iso(),
    };

    db.query(
      `UPDATE incidents SET
        title=?, description=?, employee_id=?, type=?, severity=?, status=?,
        occurred_at=?, location=?, reported_by=?, assigned_to=?,
        resolution_note=?, closed_at=?, updated_at=?
       WHERE id=?`,
    ).run(
      updated.title,
      updated.description,
      updated.employee_id,
      updated.type,
      updated.severity,
      updated.status,
      updated.occurred_at,
      updated.location,
      updated.reported_by,
      updated.assigned_to,
      updated.resolution_note,
      updated.closed_at,
      updated.updated_at,
      id,
    );

    append_history({
      resource: "incidents",
      record_id: id,
      action: "update",
      summary: `Incidencia actualizada: ${updated.folio}`,
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

function soft_delete(id: string, identity: KirletIdentity | null): Response {
  const db = get_db();
  const existing = db
    .query(`SELECT * FROM incidents WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!existing) return not_found(`/incidents/${id}`);
  const before = map_row(existing);
  const iso = now_iso();
  db.query(
    `UPDATE incidents SET is_active = 0, status = CASE
       WHEN status IN ('cerrada','cancelada') THEN status ELSE 'cancelada' END,
       closed_at = COALESCE(closed_at, ?), updated_at = ? WHERE id = ?`,
  ).run(iso, iso, id);
  const after = {
    ...before,
    is_active: 0,
    status:
      before.status === "cerrada" || before.status === "cancelada"
        ? before.status
        : ("cancelada" as const),
    closed_at: before.closed_at ?? iso,
    updated_at: iso,
  };
  append_history({
    resource: "incidents",
    record_id: id,
    action: "delete",
    summary: `Incidencia desactivada: ${before.folio}`,
    payload: { before, after },
    actor: actor_from(identity),
  });
  return json({ data: after });
}

const ACTION_STATUS: Record<string, IncidentStatus> = {
  review: "en_revision",
  start: "en_proceso",
  resolve: "resuelta",
  close: "cerrada",
  cancel: "cancelada",
  reopen: "abierta",
};

async function transition(
  req: Request,
  id: string,
  action: string,
  identity: KirletIdentity | null,
): Promise<Response> {
  const target = ACTION_STATUS[action];
  if (!target) {
    return error("validation_error", `Acción desconocida: ${action}`, 400);
  }

  const db = get_db();
  const existing = db
    .query(`SELECT * FROM incidents WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!existing) return not_found(`/incidents/${id}`);
  const before = map_row(existing);

  if (!can_transition_incident_status(before.status, target)) {
    return error(
      "invalid_transition",
      `No se puede ${action}: ${before.status} → ${target}`,
      400,
    );
  }

  let note: string | null = null;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      resolution_note?: string;
      note?: string;
    };
    note =
      body.resolution_note?.trim() ||
      body.note?.trim() ||
      before.resolution_note;
  } catch {
    note = before.resolution_note;
  }

  const iso = now_iso();
  const closed_at =
    target === "cerrada" || target === "cancelada" ? iso : null;

  db.query(
    `UPDATE incidents SET status=?, resolution_note=?, closed_at=?, updated_at=? WHERE id=?`,
  ).run(target, note, closed_at, iso, id);

  const after: Incident = {
    ...before,
    status: target,
    resolution_note: note,
    closed_at,
    updated_at: iso,
  };

  append_history({
    resource: "incidents",
    record_id: id,
    action: "update",
    summary: `Incidencia ${action}: ${before.folio} → ${target}`,
    payload: { before, after },
    actor: actor_from(identity),
  });

  return json({ data: after });
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion INCIDENTS ROUTES
// (o==================================================================o)
