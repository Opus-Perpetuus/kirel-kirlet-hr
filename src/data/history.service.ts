// (o==================================================================o)
//   #region HISTORY SERVICE (class, kit-mediated)
// (o-----------------------------------------------------------\/-----o)

import type { KirletDataClient } from "@opus-perpetuus/kirel-nox-kit";
import { KirletRepository } from "@opus-perpetuus/kirel-nox-kit";
import { new_id, now_iso } from "../http.ts";

export type HistoryRow = {
  id: string;
  resource: string;
  record_id: string;
  action: string;
  summary: string;
  payload: string | null;
  actor: string | null;
  created_at: string;
};

const MAX_PER_RESOURCE = 500;

export class HistoryService {
  private readonly repo: KirletRepository<HistoryRow>;

  constructor(data: KirletDataClient) {
    this.repo = new KirletRepository(data, "history");
  }

  async append(input: {
    resource: string;
    record_id: string;
    action: string;
    summary: string;
    payload?: unknown;
    actor?: string | null;
  }): Promise<void> {
    await this.repo.insert({
      id: new_id("hist"),
      resource: input.resource,
      record_id: input.record_id,
      action: input.action,
      summary: input.summary,
      payload:
        input.payload === undefined
          ? null
          : typeof input.payload === "string"
            ? input.payload
            : JSON.stringify(input.payload),
      actor: input.actor ?? null,
      created_at: now_iso(),
    });

    // Cap history rows per resource (best-effort)
    const all = await this.repo.findMany({
      where: { resource: input.resource },
      orderBy: { created_at: "desc" },
      limit: MAX_PER_RESOURCE + 50,
    });
    if (all.length > MAX_PER_RESOURCE) {
      const drop = all.slice(MAX_PER_RESOURCE);
      for (const row of drop) {
        await this.repo.deleteById(row.id);
      }
    }
  }

  async list(opts: {
    resource?: string;
    record_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: HistoryRow[]; total: number }> {
    const where: Record<string, string> = {};
    if (opts.resource) where.resource = opts.resource;
    if (opts.record_id) where.record_id = opts.record_id;
    const total = await this.repo.count(where);
    const data = await this.repo.findMany({
      where,
      orderBy: { created_at: "desc" },
      limit: opts.limit ?? 50,
      offset: opts.offset ?? 0,
    });
    return { data, total };
  }
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion HISTORY SERVICE
// (o==================================================================o)
