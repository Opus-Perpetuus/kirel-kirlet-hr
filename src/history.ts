// (o==================================================================o)
//   #region HISTORY (facade over HistoryService + kit data client)
// (o-----------------------------------------------------------\/-----o)

import { get_data } from "./data/bootstrap.ts";
import {
  HistoryService,
  type HistoryRow,
} from "./data/history.service.ts";

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

function service(): HistoryService {
  return new HistoryService(get_data());
}

function decode_payload(payload: string | null): unknown {
  if (payload == null) return null;
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

function to_entry(row: HistoryRow): HistoryEntry {
  return {
    id: row.id,
    resource: row.resource,
    record_id: row.record_id,
    action: row.action,
    summary: row.summary,
    payload: decode_payload(row.payload),
    actor: row.actor,
    created_at: row.created_at,
  };
}

/** Append history (async). Prefer HistoryService in modules. */
export async function append_history(entry: {
  resource: string;
  record_id: string;
  action: string;
  summary: string;
  payload?: unknown;
  actor?: string | null;
}): Promise<void> {
  await service().append(entry);
}

export async function list_history(opts?: {
  resource?: string;
  record_id?: string;
  take?: number;
  skip?: number;
}): Promise<{ data: HistoryEntry[]; total: number }> {
  const take = Math.min(Math.max(opts?.take ?? 100, 1), 500);
  const skip = Math.max(opts?.skip ?? 0, 0);
  const result = await service().list({
    resource: opts?.resource,
    record_id: opts?.record_id,
    limit: take,
    offset: skip,
  });
  return {
    data: result.data.map(to_entry),
    total: result.total,
  };
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion HISTORY
// (o==================================================================o)
