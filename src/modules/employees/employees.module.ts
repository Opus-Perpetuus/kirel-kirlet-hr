// (o==================================================================o)
//   #region EMPLOYEES MODULE (class + kit repository)
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
  today_iso,
} from "../../http.ts";
import { require_access, actor_from } from "../../auth.ts";
import { HistoryService } from "../../data/history.service.ts";
import { normalize_employee_input, type Employee } from "./schema.ts";
import { build_employees_page } from "./descriptors.ts";

const SORTABLE = new Set([
  "name",
  "full_name",
  "email",
  "hired_at",
  "created_at",
  "updated_at",
]);

export class EmployeesModule extends KirletModule {
  private readonly employees: KirletRepository<Employee>;
  private readonly history: HistoryService;

  constructor(data: KirletDataClient) {
    super(data);
    this.employees = new KirletRepository(data, "employees");
    this.history = new HistoryService(data);
  }

  pages() {
    return [
      {
        id: "hr.employees",
        path: "employees",
        permission: "kirlet.hr.employees.read",
        build: build_employees_page as () => NoxPageDescriptor,
      },
    ];
  }

  override async handle(ctx: KirletRouteContext): Promise<Response | null> {
    const { req, path, url, identity } = ctx;

    const team_match = path.match(/^\/employees\/([^/]+)\/team$/);
    if (team_match) {
      if (req.method !== "GET") return method_not_allowed(["GET"]);
      const denied = require_access(identity, "employees", "read");
      if (denied) return denied;
      return this.get_team(team_match[1]!);
    }

    const one = path.match(/^\/employees\/([^/]+)$/);
    if (one) {
      const id = one[1]!;
      if (req.method === "GET") {
        const denied = require_access(identity, "employees", "read");
        if (denied) return denied;
        return this.get_one(id);
      }
      if (req.method === "PATCH") {
        const denied = require_access(identity, "employees", "update");
        if (denied) return denied;
        return this.patch_one(req, id, identity);
      }
      if (req.method === "DELETE") {
        const denied = require_access(identity, "employees", "delete");
        if (denied) return denied;
        return this.soft_delete(id, identity);
      }
      return method_not_allowed(["GET", "PATCH", "DELETE"]);
    }

    if (path === "/employees") {
      if (req.method === "GET") {
        const denied = require_access(identity, "employees", "read");
        if (denied) return denied;
        return this.list(url);
      }
      if (req.method === "POST") {
        const denied = require_access(identity, "employees", "create");
        if (denied) return denied;
        return this.create(req, identity);
      }
      return method_not_allowed(["GET", "POST"]);
    }

    return null;
  }

  private row(r: Record<string, unknown>): Employee {
    return {
      id: String(r.id),
      name: String(r.name),
      full_name: String(r.full_name),
      email: String(r.email),
      department_id: (r.department_id as string) ?? null,
      position_id: (r.position_id as string) ?? null,
      manager_id: (r.manager_id as string) ?? null,
      user_id: (r.user_id as string) ?? null,
      hired_at: (r.hired_at as string) ?? null,
      phone: (r.phone as string) ?? null,
      rfc: (r.rfc as string) ?? null,
      curp: (r.curp as string) ?? null,
      nss: (r.nss as string) ?? null,
      is_active: Number(r.is_active),
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
    };
  }

  private async list(url: URL): Promise<Response> {
    if (url.searchParams.get("as") === "options") {
      const rows = await this.employees.findMany({
        where: { is_active: 1 },
        orderBy: { name: "asc" },
      });
      return json({
        data: rows.map((r) => ({
          value: r.id,
          label: r.full_name || r.name,
        })),
      });
    }

    const q = parse_list_query(url.searchParams);
    const include_inactive = url.searchParams.get("include_inactive") === "1";
    const where = include_inactive ? undefined : { is_active: 1 as const };
    let orderBy: Record<string, "asc" | "desc"> = { name: "asc" };
    if (q.sort) {
      const [col, dir] = q.sort.split(":");
      if (col && SORTABLE.has(col) && (dir === "asc" || dir === "desc")) {
        orderBy = { [col]: dir };
      }
    }

    const search = q.q
      ? {
          fields: ["name", "full_name", "email", "phone", "rfc"],
          q: q.q,
        }
      : undefined;

    const total = await this.employees.count(where);
    // count with search is approximate when search is set — re-list for total
    const all_for_total = search
      ? await this.employees.findMany({ where, search, limit: 10000 })
      : null;
    const effective_total = all_for_total ? all_for_total.length : total;

    const rows = await this.employees.findMany({
      where,
      search,
      orderBy,
      limit: q.take,
      offset: q.skip,
    });

    return json({
      data: rows.map((r) => this.row(r)),
      total: effective_total,
    });
  }

  private async get_one(id: string): Promise<Response> {
    const row = await this.employees.findById(id);
    if (!row) return not_found(`/employees/${id}`);
    return json({ data: this.row(row) });
  }

  private async get_team(id: string): Promise<Response> {
    const manager = await this.employees.findById(id);
    if (!manager) return not_found(`/employees/${id}`);
    const rows = await this.employees.findMany({
      where: { manager_id: id, is_active: 1 },
      orderBy: { name: "asc" },
    });
    return json({ data: rows.map((r) => this.row(r)), total: rows.length });
  }

  private async create(
    req: Request,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    try {
      const body = await req.json();
      const input = normalize_employee_input(body) as {
        name: string;
        full_name: string;
        email: string;
        department_id?: string | null;
        position_id?: string | null;
        manager_id?: string | null;
        user_id?: string | null;
        hired_at?: string | null;
        phone?: string | null;
        rfc?: string | null;
        curp?: string | null;
        nss?: string | null;
      };

      const existing = await this.employees.findOne({ email: input.email });
      if (existing) {
        return error("conflict", "El correo ya está registrado", 409);
      }

      const id = new_id("emp");
      const iso = now_iso();
      const row: Employee = {
        id,
        name: input.name || input.full_name,
        full_name: input.full_name,
        email: input.email,
        department_id: input.department_id ?? null,
        position_id: input.position_id ?? null,
        manager_id: input.manager_id ?? null,
        user_id: input.user_id ?? null,
        hired_at: input.hired_at ?? today_iso(),
        phone: input.phone ?? null,
        rfc: input.rfc ?? null,
        curp: input.curp ?? null,
        nss: input.nss ?? null,
        is_active: 1,
        created_at: iso,
        updated_at: iso,
      };

      await this.employees.insert(row);
      await this.history.append({
        resource: "employees",
        record_id: id,
        action: "create",
        summary: `Empleado creado: ${row.full_name}`,
        payload: { after: row },
        actor: actor_from(identity),
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

  private async patch_one(
    req: Request,
    id: string,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    try {
      const existing = await this.employees.findById(id);
      if (!existing) return not_found(`/employees/${id}`);
      const before = this.row(existing);
      const body = await req.json();
      const input = normalize_employee_input({ ...before, ...body }, true);

      if (input.email && input.email !== before.email) {
        const dup = await this.employees.findOne({ email: input.email as string });
        if (dup && dup.id !== id) {
          return error("conflict", "El correo ya está registrado", 409);
        }
      }

      const updated: Employee = {
        ...before,
        name: (input.name as string) ?? before.name,
        full_name: (input.full_name as string) ?? before.full_name,
        email: (input.email as string) ?? before.email,
        department_id:
          input.department_id !== undefined
            ? (input.department_id as string | null)
            : before.department_id,
        position_id:
          input.position_id !== undefined
            ? (input.position_id as string | null)
            : before.position_id,
        manager_id:
          input.manager_id !== undefined
            ? (input.manager_id as string | null)
            : before.manager_id,
        user_id:
          input.user_id !== undefined
            ? (input.user_id as string | null)
            : before.user_id,
        hired_at:
          input.hired_at !== undefined
            ? (input.hired_at as string | null)
            : before.hired_at,
        phone:
          input.phone !== undefined
            ? (input.phone as string | null)
            : before.phone,
        rfc: input.rfc !== undefined ? (input.rfc as string | null) : before.rfc,
        curp:
          input.curp !== undefined ? (input.curp as string | null) : before.curp,
        nss: input.nss !== undefined ? (input.nss as string | null) : before.nss,
        is_active:
          input.is_active !== undefined
            ? Number(input.is_active)
            : before.is_active,
        updated_at: now_iso(),
      };

      const { id: _id, created_at: _c, ...patch } = updated;
      await this.employees.updateById(id, patch);
      await this.history.append({
        resource: "employees",
        record_id: id,
        action: "update",
        summary: `Empleado actualizado: ${updated.full_name}`,
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

  private async soft_delete(
    id: string,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    const existing = await this.employees.findById(id);
    if (!existing) return not_found(`/employees/${id}`);
    const before = this.row(existing);
    const updated_at = now_iso();
    await this.employees.updateById(id, { is_active: 0, updated_at });
    const after = { ...before, is_active: 0, updated_at };
    await this.history.append({
      resource: "employees",
      record_id: id,
      action: "delete",
      summary: `Empleado desactivado: ${before.full_name}`,
      payload: { before, after },
      actor: actor_from(identity),
    });
    return json({ data: after });
  }
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion EMPLOYEES MODULE
// (o==================================================================o)
