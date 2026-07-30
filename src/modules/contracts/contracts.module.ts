// (o==================================================================o)
//   #region CONTRACTS MODULE (class + kit repository)
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
import {
  normalize_contract_input,
  effective_status,
  type Contract,
} from "./schema.ts";
import { build_contracts_page } from "./descriptors.ts";

export class ContractsModule extends KirletModule {
  private readonly contracts: KirletRepository<Contract>;
  private readonly employees: KirletRepository;
  private readonly history: HistoryService;

  constructor(data: KirletDataClient) {
    super(data);
    this.contracts = new KirletRepository(data, "contracts");
    this.employees = new KirletRepository(data, "employees");
    this.history = new HistoryService(data);
  }

  pages() {
    return [
      {
        id: "hr.contracts",
        path: "contracts",
        permission: "kirlet.hr.contracts.read",
        build: build_contracts_page as () => NoxPageDescriptor,
      },
    ];
  }

  override async handle(ctx: KirletRouteContext): Promise<Response | null> {
    const { req, path, url, identity } = ctx;

    const one = path.match(/^\/contracts\/([^/]+)$/);
    if (one) {
      const id = one[1]!;
      if (req.method === "GET") {
        const denied = require_access(identity, "contracts", "read");
        if (denied) return denied;
        return this.get_one(id);
      }
      if (req.method === "PATCH") {
        const denied = require_access(identity, "contracts", "update");
        if (denied) return denied;
        return this.patch_one(req, id, identity);
      }
      if (req.method === "DELETE") {
        const denied = require_access(identity, "contracts", "delete");
        if (denied) return denied;
        return this.remove(id, identity);
      }
      return method_not_allowed(["GET", "PATCH", "DELETE"]);
    }

    if (path === "/contracts") {
      if (req.method === "GET") {
        const denied = require_access(identity, "contracts", "read");
        if (denied) return denied;
        return this.list(url);
      }
      if (req.method === "POST") {
        const denied = require_access(identity, "contracts", "create");
        if (denied) return denied;
        return this.create(req, identity);
      }
      return method_not_allowed(["GET", "POST"]);
    }

    return null;
  }

  private row(r: Record<string, unknown>): Contract {
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

  private async sync_vencido(
    id: string,
    status: string,
    end_date: string | null,
  ): Promise<void> {
    if (status === "activo" && end_date && end_date < today_iso()) {
      await this.contracts.updateById(id, {
        status: "vencido",
        updated_at: now_iso(),
      } as Partial<Contract>);
    }
  }

  private matches_status_filter(
    stored_status: string,
    end_date: string | null,
    filter: string,
  ): boolean {
    const today = today_iso();
    if (filter === "vencido") {
      return (
        stored_status === "vencido" ||
        (stored_status === "activo" &&
          end_date != null &&
          end_date < today)
      );
    }
    if (filter === "activo") {
      return (
        stored_status === "activo" &&
        (end_date == null || end_date >= today)
      );
    }
    return stored_status === filter;
  }

  private async list(url: URL): Promise<Response> {
    const q = parse_list_query(url.searchParams);
    const employee_id = url.searchParams.get("employee_id");
    const status = url.searchParams.get("status");

    const where: Record<string, string> | undefined = employee_id
      ? { employee_id }
      : undefined;

    let rows = await this.contracts.findMany({
      where,
      orderBy: { start_date: "desc" },
      limit: 10000,
    });

    if (status) {
      rows = rows.filter((r) =>
        this.matches_status_filter(
          String(r.status),
          (r.end_date as string) ?? null,
          status,
        ),
      );
    }

    const total = rows.length;
    const page = rows.slice(q.skip, q.skip + q.take);

    const data: Contract[] = [];
    for (const r of page) {
      const c = this.row(r);
      if (c.status === "vencido" && String(r.status) === "activo") {
        await this.sync_vencido(c.id, String(r.status), c.end_date);
      }
      data.push(c);
    }

    return json({ data, total });
  }

  private async get_one(id: string): Promise<Response> {
    const r = await this.contracts.findById(id);
    if (!r) return not_found(`/contracts/${id}`);
    const c = this.row(r);
    if (c.status === "vencido" && String(r.status) === "activo") {
      await this.sync_vencido(c.id, String(r.status), c.end_date);
    }
    return json({ data: c });
  }

  private async create(
    req: Request,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    try {
      const input = normalize_contract_input(await req.json());
      const emp = await this.employees.findById(input.employee_id!);
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

      await this.contracts.insert(rec);
      await this.history.append({
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

  private async patch_one(
    req: Request,
    id: string,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    try {
      const existing = await this.contracts.findById(id);
      if (!existing) return not_found(`/contracts/${id}`);
      const before = this.row(existing);
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

      const { id: _id, created_at: _c, ...patch } = updated;
      await this.contracts.updateById(id, patch);
      await this.history.append({
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

  private async remove(
    id: string,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    const existing = await this.contracts.findById(id);
    if (!existing) return not_found(`/contracts/${id}`);
    const before = this.row(existing);
    await this.contracts.deleteById(id);
    await this.history.append({
      resource: "contracts",
      record_id: id,
      action: "delete",
      summary: `Contrato eliminado: ${id}`,
      payload: { before },
      actor: actor_from(identity),
    });
    return json({ data: before });
  }
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion CONTRACTS MODULE
// (o==================================================================o)
