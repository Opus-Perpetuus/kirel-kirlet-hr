// (o==================================================================o)
//   #region POSITIONS MODULE (class + kit repository)
// (o-----------------------------------------------------------\/-----o)

import {
  parse_list_query,
  KirletModule,
  KirletRepository,
  type KirletDataClient,
  type KirletIdentity,
  type KirletRouteContext,
  type NoxPageDescriptor,
} from "@opus-perpetuus/kirel-nox-kit";
import {
  json,
  error,
  not_found,
  method_not_allowed,
  new_id,
  now_iso,
} from "../../http.ts";
import { require_access, actor_from } from "../../auth.ts";
import { HistoryService } from "../../data/history.service.ts";
import { normalize_position_input, type Position } from "./schema.ts";
import { build_positions_page } from "./descriptors.ts";

export class PositionsModule extends KirletModule {
  private readonly positions: KirletRepository<Position>;
  private readonly history: HistoryService;

  constructor(data: KirletDataClient) {
    super(data);
    this.positions = new KirletRepository(data, "positions");
    this.history = new HistoryService(data);
  }

  pages() {
    return [
      {
        id: "hr.positions",
        path: "positions",
        permission: "kirlet.hr.positions.read",
        build: build_positions_page as () => NoxPageDescriptor,
      },
    ];
  }

  override async handle(ctx: KirletRouteContext): Promise<Response | null> {
    const { req, path, url, identity } = ctx;

    const one = path.match(/^\/positions\/([^/]+)$/);
    if (one) {
      const id = one[1]!;
      if (req.method === "GET") {
        const denied = require_access(identity, "positions", "read");
        if (denied) return denied;
        return this.get_one(id);
      }
      if (req.method === "PATCH") {
        const denied = require_access(identity, "positions", "update");
        if (denied) return denied;
        return this.patch_one(req, id, identity);
      }
      if (req.method === "DELETE") {
        const denied = require_access(identity, "positions", "delete");
        if (denied) return denied;
        return this.remove(id, identity);
      }
      return method_not_allowed(["GET", "PATCH", "DELETE"]);
    }

    if (path === "/positions") {
      if (req.method === "GET") {
        const denied = require_access(identity, "positions", "read");
        if (denied) return denied;
        return this.list(url);
      }
      if (req.method === "POST") {
        const denied = require_access(identity, "positions", "create");
        if (denied) return denied;
        return this.create(req, identity);
      }
      return method_not_allowed(["GET", "POST"]);
    }

    return null;
  }

  private row(r: Record<string, unknown>): Position {
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

  private async list(url: URL): Promise<Response> {
    if (url.searchParams.get("as") === "options") {
      const rows = await this.positions.findMany({
        where: { is_active: 1 },
        orderBy: { name: "asc" },
      });
      return json({
        data: rows.map((r) => ({ value: r.id, label: r.name })),
      });
    }

    const q = parse_list_query(url.searchParams);
    const include_inactive = url.searchParams.get("include_inactive") === "1";
    const where = include_inactive ? undefined : { is_active: 1 as const };
    const search = q.q
      ? { fields: ["name", "description"], q: q.q }
      : undefined;

    const all_for_total = search
      ? await this.positions.findMany({ where, search, limit: 10000 })
      : null;
    const total = all_for_total
      ? all_for_total.length
      : await this.positions.count(where);

    const rows = await this.positions.findMany({
      where,
      search,
      orderBy: { name: "asc" },
      limit: q.take,
      offset: q.skip,
    });

    return json({ data: rows.map((r) => this.row(r)), total });
  }

  private async get_one(id: string): Promise<Response> {
    const r = await this.positions.findById(id);
    if (!r) return not_found(`/positions/${id}`);
    return json({ data: this.row(r) });
  }

  private async create(
    req: Request,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    try {
      const input = normalize_position_input(await req.json());
      const dup = await this.positions.findOne({ name: input.name! });
      if (dup) {
        return error("conflict", "El puesto ya existe", 409);
      }
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
      await this.positions.insert(rec);
      await this.history.append({
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

  private async patch_one(
    req: Request,
    id: string,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    try {
      const existing = await this.positions.findById(id);
      if (!existing) return not_found(`/positions/${id}`);
      const before = this.row(existing);
      const input = normalize_position_input(await req.json(), true);
      if (input.name && input.name !== before.name) {
        const dup = await this.positions.findOne({ name: input.name });
        if (dup && dup.id !== id) {
          return error("conflict", "El puesto ya existe", 409);
        }
      }
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
      const { id: _id, created_at: _c, ...patch } = updated;
      await this.positions.updateById(id, patch);
      await this.history.append({
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

  private async remove(
    id: string,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    const existing = await this.positions.findById(id);
    if (!existing) return not_found(`/positions/${id}`);
    const before = this.row(existing);
    await this.positions.deleteById(id);
    await this.history.append({
      resource: "positions",
      record_id: id,
      action: "delete",
      summary: `Puesto eliminado: ${before.name}`,
      payload: { before },
      actor: actor_from(identity),
    });
    return json({ data: before });
  }
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion POSITIONS MODULE
// (o==================================================================o)
