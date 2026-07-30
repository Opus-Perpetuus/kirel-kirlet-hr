// (o==================================================================o)
//   #region DEPARTMENTS MODULE (class + kit repository)
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
import { normalize_department_input, type Department } from "./schema.ts";
import { build_departments_page } from "./descriptors.ts";

export class DepartmentsModule extends KirletModule {
  private readonly departments: KirletRepository<Department>;
  private readonly employees: KirletRepository;
  private readonly history: HistoryService;

  constructor(data: KirletDataClient) {
    super(data);
    this.departments = new KirletRepository(data, "departments");
    this.employees = new KirletRepository(data, "employees");
    this.history = new HistoryService(data);
  }

  pages() {
    return [
      {
        id: "hr.departments",
        path: "departments",
        permission: "kirlet.hr.departments.read",
        build: build_departments_page as () => NoxPageDescriptor,
      },
    ];
  }

  override async handle(ctx: KirletRouteContext): Promise<Response | null> {
    const { req, path, url, identity } = ctx;

    const one = path.match(/^\/departments\/([^/]+)$/);
    if (one) {
      const id = one[1]!;
      if (req.method === "GET") {
        const denied = require_access(identity, "departments", "read");
        if (denied) return denied;
        return this.get_one(id);
      }
      if (req.method === "PATCH") {
        const denied = require_access(identity, "departments", "update");
        if (denied) return denied;
        return this.patch_one(req, id, identity);
      }
      if (req.method === "DELETE") {
        const denied = require_access(identity, "departments", "delete");
        if (denied) return denied;
        return this.remove(id, identity);
      }
      return method_not_allowed(["GET", "PATCH", "DELETE"]);
    }

    if (path === "/departments") {
      if (req.method === "GET") {
        const denied = require_access(identity, "departments", "read");
        if (denied) return denied;
        return this.list(url);
      }
      if (req.method === "POST") {
        const denied = require_access(identity, "departments", "create");
        if (denied) return denied;
        return this.create(req, identity);
      }
      return method_not_allowed(["GET", "POST"]);
    }

    return null;
  }

  private row(r: Record<string, unknown>): Department {
    return {
      id: String(r.id),
      name: String(r.name),
      description: (r.description as string) ?? null,
      is_active: Number(r.is_active),
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
    };
  }

  private async list(url: URL): Promise<Response> {
    if (url.searchParams.get("as") === "options") {
      const rows = await this.departments.findMany({
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
      ? await this.departments.findMany({ where, search, limit: 10000 })
      : null;
    const total = all_for_total
      ? all_for_total.length
      : await this.departments.count(where);

    const rows = await this.departments.findMany({
      where,
      search,
      orderBy: { name: "asc" },
      limit: q.take,
      offset: q.skip,
    });

    return json({ data: rows.map((r) => this.row(r)), total });
  }

  private async get_one(id: string): Promise<Response> {
    const r = await this.departments.findById(id);
    if (!r) return not_found(`/departments/${id}`);
    return json({ data: this.row(r) });
  }

  private async create(
    req: Request,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    try {
      const input = normalize_department_input(await req.json());
      const dup = await this.departments.findOne({ name: input.name! });
      if (dup) {
        return error("conflict", "El departamento ya existe", 409);
      }
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
      await this.departments.insert(rec);
      await this.history.append({
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

  private async patch_one(
    req: Request,
    id: string,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    try {
      const existing = await this.departments.findById(id);
      if (!existing) return not_found(`/departments/${id}`);
      const before = this.row(existing);
      const input = normalize_department_input(await req.json(), true);
      if (input.name && input.name !== before.name) {
        const dup = await this.departments.findOne({ name: input.name });
        if (dup && dup.id !== id) {
          return error("conflict", "El departamento ya existe", 409);
        }
      }
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
      const { id: _id, created_at: _c, ...patch } = updated;
      await this.departments.updateById(id, patch);
      await this.history.append({
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

  private async remove(
    id: string,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    const existing = await this.departments.findById(id);
    if (!existing) return not_found(`/departments/${id}`);
    const before = this.row(existing);

    const active_emps = await this.employees.count({
      department_id: id,
      is_active: 1,
    });
    if (active_emps > 0) {
      return error(
        "conflict",
        `No se puede eliminar: hay ${active_emps} empleado(s) activo(s) en el departamento`,
        409,
      );
    }

    await this.departments.deleteById(id);
    await this.history.append({
      resource: "departments",
      record_id: id,
      action: "delete",
      summary: `Departamento eliminado: ${before.name}`,
      payload: { before },
      actor: actor_from(identity),
    });
    return json({ data: before });
  }
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DEPARTMENTS MODULE
// (o==================================================================o)
