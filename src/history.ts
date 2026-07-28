// (o==================================================================o)
//   #region HISTORY
// (o-----------------------------------------------------------\/-----o)

import { get_db } from "./db.ts";
import { HISTORY_CAP_PER_RESOURCE } from "./config.ts";
import { new_id, now_iso } from "./http.ts";

export type HistoryEntry = {
  id: string;
  resource: string;
  record_id: string;
  action: string;
  summary: string;
  payload: unknown;
  actor: string | null;
  created_at: string;
};

export function append_history(entry: {
  resource: string;
  record_id: string;
  action: string;
  summary: string;
  payload?: unknown;
  actor?: string | null;
}): HistoryEntry {
  const db = get_db();
  const row: HistoryEntry = {
    id: new_id("hist"),
    resource: entry.resource,
    record_id: entry.record_id,
    action: entry.action,
    summary: entry.summary,
    payload: entry.payload ?? null,
    actor: entry.actor ?? null,
    created_at: now_iso(),
  };

  db.query(
    `INSERT INTO history (id, resource, record_id, action, summary, payload, actor, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.id,
    row.resource,
    row.record_id,
    row.action,
    row.summary,
    row.payload == null ? null : JSON.stringify(row.payload),
    row.actor,
    row.created_at,
  );

  // Cap 5000 per resource type
  const count = (
    db
      .query(`SELECT COUNT(*) AS c FROM history WHERE resource = ?`)
      .get(row.resource) as { c: number }
  ).c;
  if (count > HISTORY_CAP_PER_RESOURCE) {
    const excess = count - HISTORY_CAP_PER_RESOURCE;
    db.query(
      `DELETE FROM history WHERE id IN (
         SELECT id FROM history WHERE resource = ?
         ORDER BY created_at ASC LIMIT ?
       )`,
    ).run(row.resource, excess);
  }

  return row;
}

export function list_history(opts?: {
  resource?: string;
  record_id?: string;
  take?: number;
  skip?: number;
}): { data: HistoryEntry[]; total: number } {
  const db = get_db();
  const take = Math.min(Math.max(opts?.take ?? 100, 1), 500);
  const skip = Math.max(opts?.skip ?? 0, 0);

  const where: string[] = [];
  const params: unknown[] = [];
  if (opts?.resource) {
    where.push("resource = ?");
    params.push(opts.resource);
  }
  if (opts?.record_id) {
    where.push("record_id = ?");
    params.push(opts.record_id);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const total = (
    db
      .query(`SELECT COUNT(*) AS c FROM history ${clause}`)
      .get(...params) as { c: number }
  ).c;

  const rows = db
    .query(
      `SELECT * FROM history ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, take, skip) as Array<{
    id: string;
    resource: string;
    record_id: string;
    action: string;
    summary: string;
    payload: string | null;
    actor: string | null;
    created_at: string;
  }>;

  return {
    data: rows.map((r) => ({
      id: r.id,
      resource: r.resource,
      record_id: r.record_id,
      action: r.action,
      summary: r.summary,
      payload: r.payload ? safe_json(r.payload) : null,
      actor: r.actor,
      created_at: r.created_at,
    })),
    total,
  };
}

function safe_json(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion HISTORY
// (o==================================================================o)
