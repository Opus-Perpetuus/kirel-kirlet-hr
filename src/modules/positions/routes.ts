// (o==================================================================o)
//   #region POSITIONS ROUTES
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
import { normalize_position_input, type Position } from "./schema.ts";

export async function handle_positions(
  req: Request,
  path: string,
  url: URL,
  identity: KirletIdentity | null,
): Promise<Response | null> {
  const one = path.match(/^\/positions\/([^/]+)$/);
  if (one) {
    const id = one[1]!;
    if (req.method === "GET") {
      const denied = require_access(identity, "positions", "read");
      if (denied) return denied;
      return get_one(id);
    }
    if (req.method === "PATCH") {
      const denied = require_access(identity, "positions", "update");
      if (denied) return denied;
      return patch_one(req, id, identity);
    }
    if (req.method === "DELETE") {
      const denied = require_access(identity, "positions", "delete");
      if (denied) return denied;
      return remove(id, identity);
    }
    return method_not_allowed(["GET", "PATCH", "DELETE"]);
  }

  if (path === "/positions") {
    if (req.method === "GET") {
      const denied = require_access(identity, "positions", "read");
      if (denied) return denied;
      return list(url);
    }
    if (req.method === "POST") {
      const denied = require_access(identity, "positions", "create");
      if (denied) return denied;
      return create(req, identity);
    }
    return method_not_allowed(["GET", "POST"]);
  }

  return null;
}

function row(r: Record<string, unknown>): Position {
  return {
    id: String(r.id),
    name: String(r.name),
    department_id: (r.department_id as string) ?? null,
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
        `SELECT id, name FROM positions WHERE is_active = 1 ORDER BY name ASC`,
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
      .query(`SELECT COUNT(*) AS c FROM positions ${clause}`)
      .get(...params) as { c: number }
  ).c;
  const rows = db
    .query(
      `SELECT * FROM positions ${clause} ORDER BY name ASC LIMIT ? OFFSET ?`,
    )
    .all(...params, q.take, q.skip) as Array<Record<string, unknown>>;
  return json({ data: rows.map(row), total });
}

function get_one(id: string): Response {
  const db = get_db();
  const r = db
    .query(`SELECT * FROM positions WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!r) return not_found(`/positions/${id}`);
  return json({ data: row(r) });
}

async function create(
  req: Request,
  identity: KirletIdentity | null,
): Promise<Response> {
  try {
    const input = normalize_position_input(await req.json());
    const db = get_db();
    const id = new_id("pos");
    const iso = now_iso();
    const rec: Position = {
      id,
      name: input.name!,
      department_id: input.department_id ?? null,
      description: input.description ?? null,
      is_active: 1,
      created_at: iso,
      updated_at: iso,
    };
    try {
      db.query(
        `INSERT INTO positions (id, name, department_id, description, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        rec.id,
        rec.name,
        rec.department_id,
        rec.description,
        rec.is_active,
        rec.created_at,
        rec.updated_at,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("UNIQUE") || msg.includes("unique")) {
        return error("conflict", "El puesto ya existe", 409);
      }
      throw e;
    }
    append_history({
      resource: "positions",
      record_id: id,
      action: "create",
      summary: `Puesto creado: ${rec.name}`,
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
      .query(`SELECT * FROM positions WHERE id = ?`)
      .get(id) as Record<string, unknown> | null;
    if (!existing) return not_found(`/positions/${id}`);
    const before = row(existing);
    const input = normalize_position_input(await req.json(), true);
    const updated: Position = {
      ...before,
      name: input.name ?? before.name,
      department_id:
        input.department_id !== undefined
          ? input.department_id
          : before.department_id,
      description:
        input.description !== undefined
          ? input.description
          : before.description,
      is_active:
        input.is_active !== undefined ? input.is_active : before.is_active,
      updated_at: now_iso(),
    };
    db.query(
      `UPDATE positions SET name=?, department_id=?, description=?, is_active=?, updated_at=? WHERE id=?`,
    ).run(
      updated.name,
      updated.department_id,
      updated.description,
      updated.is_active,
      updated.updated_at,
      id,
    );
    append_history({
      resource: "positions",
      record_id: id,
      action: "update",
      summary: `Puesto actualizado: ${updated.name}`,
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
    .query(`SELECT * FROM positions WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!existing) return not_found(`/positions/${id}`);
  const before = row(existing);
  db.query(`DELETE FROM positions WHERE id = ?`).run(id);
  append_history({
    resource: "positions",
    record_id: id,
    action: "delete",
    summary: `Puesto eliminado: ${before.name}`,
    payload: { before },
    actor: actor_from(identity),
  });
  return json({ data: before });
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion POSITIONS ROUTES
// (o==================================================================o)
