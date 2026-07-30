// (o==================================================================o)
//   #region LEAVE MODULE (class + kit repository)
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
import {
  normalize_leave_type_input,
  normalize_leave_request_input,
  compute_days,
  type LeaveType,
  type LeaveRequest,
  type LeaveBalance,
} from "./schema.ts";
import { build_leave_requests_page } from "./descriptors.ts";

export class LeaveModule extends KirletModule {
  private readonly types: KirletRepository<LeaveType>;
  private readonly requests: KirletRepository<LeaveRequest>;
  private readonly balances: KirletRepository<LeaveBalance>;
  private readonly history: HistoryService;

  constructor(data: KirletDataClient) {
    super(data);
    this.types = new KirletRepository(data, "leave_types");
    this.requests = new KirletRepository(data, "leave_requests");
    this.balances = new KirletRepository(data, "leave_balances");
    this.history = new HistoryService(data);
  }

  pages() {
    return [
      {
        id: "hr.leave-requests",
        path: "leave-requests",
        permission: "kirlet.hr.leave.read",
        build: build_leave_requests_page as () => NoxPageDescriptor,
      },
    ];
  }

  override async handle(ctx: KirletRouteContext): Promise<Response | null> {
    const { req, path, url, identity } = ctx;
    if (path.startsWith("/leave-types")) {
      return this.handle_types(req, path, url, identity);
    }
    if (path.startsWith("/leave-balances")) {
      return this.handle_balances(req, path, url, identity);
    }
    if (path.startsWith("/leave-requests")) {
      return this.handle_requests(req, path, url, identity);
    }
    return null;
  }

  private map_type(r: Record<string, unknown>): LeaveType {
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

  private map_request(r: Record<string, unknown>): LeaveRequest {
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

  private map_balance(r: Record<string, unknown>): LeaveBalance {
    return {
      id: String(r.id),
      employee_id: String(r.employee_id),
      leave_type_id: String(r.leave_type_id),
      year: Number(r.year),
      entitled_days: Number(r.entitled_days),
      used_days: Number(r.used_days),
    };
  }

  // --- leave-types ---

  private async handle_types(
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
        const r = await this.types.findById(id);
        if (!r) return not_found(path);
        return json({ data: this.map_type(r) });
      }
      if (req.method === "PATCH") {
        const denied = require_access(identity, "leave", "update");
        if (denied) return denied;
        return this.patch_type(req, id, identity);
      }
      if (req.method === "DELETE") {
        const denied = require_access(identity, "leave", "delete");
        if (denied) return denied;
        return this.delete_type(id, identity);
      }
      return method_not_allowed(["GET", "PATCH", "DELETE"]);
    }

    if (path === "/leave-types") {
      if (req.method === "GET") {
        const denied = require_access(identity, "leave", "read");
        if (denied) return denied;
        return this.list_types(url);
      }
      if (req.method === "POST") {
        const denied = require_access(identity, "leave", "create");
        if (denied) return denied;
        return this.create_type(req, identity);
      }
      return method_not_allowed(["GET", "POST"]);
    }
    return null;
  }

  private async list_types(url: URL): Promise<Response> {
    if (url.searchParams.get("as") === "options") {
      const rows = await this.types.findMany({
        where: { is_active: 1 },
        orderBy: { name: "asc" },
      });
      return json({
        data: rows.map((r) => ({ value: r.id, label: r.name })),
      });
    }
    const q = parse_list_query(url.searchParams);
    const total = await this.types.count();
    const rows = await this.types.findMany({
      orderBy: { name: "asc" },
      limit: q.take,
      offset: q.skip,
    });
    return json({ data: rows.map((r) => this.map_type(r)), total });
  }

  private async create_type(
    req: Request,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    try {
      const input = normalize_leave_type_input(await req.json());
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
      await this.types.insert(rec);
      await this.history.append({
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

  private async patch_type(
    req: Request,
    id: string,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    try {
      const existing = await this.types.findById(id);
      if (!existing) return not_found(`/leave-types/${id}`);
      const before = this.map_type(existing);
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
      const { id: _id, created_at: _c, ...patch } = updated;
      await this.types.updateById(id, patch);
      await this.history.append({
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

  private async delete_type(
    id: string,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    const existing = await this.types.findById(id);
    if (!existing) return not_found(`/leave-types/${id}`);
    const before = this.map_type(existing);
    await this.types.updateById(id, {
      is_active: 0,
      updated_at: now_iso(),
    });
    await this.history.append({
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

  private async handle_requests(
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
      return this.decide_request(
        req,
        decide[1]!,
        decide[2] as "approve" | "reject" | "cancel",
        identity,
      );
    }

    const one = path.match(/^\/leave-requests\/([^/]+)$/);
    if (one) {
      const id = one[1]!;
      if (req.method === "GET") {
        const denied = require_access(identity, "leave", "read");
        if (denied) return denied;
        const r = await this.requests.findById(id);
        if (!r) return not_found(path);
        return json({ data: this.map_request(r) });
      }
      if (req.method === "PATCH") {
        const denied = require_access(identity, "leave", "update");
        if (denied) return denied;
        return this.patch_request(req, id, identity);
      }
      if (req.method === "DELETE") {
        const denied = require_access(identity, "leave", "delete");
        if (denied) return denied;
        return this.delete_request(id, identity);
      }
      return method_not_allowed(["GET", "PATCH", "DELETE"]);
    }

    if (path === "/leave-requests") {
      if (req.method === "GET") {
        const denied = require_access(identity, "leave", "read");
        if (denied) return denied;
        return this.list_requests(url);
      }
      if (req.method === "POST") {
        const denied = require_access(identity, "leave", "create");
        if (denied) return denied;
        return this.create_request(req, identity);
      }
      return method_not_allowed(["GET", "POST"]);
    }
    return null;
  }

  private async list_requests(url: URL): Promise<Response> {
    const q = parse_list_query(url.searchParams);
    const where: Record<string, string> = {};
    const employee_id = url.searchParams.get("employee_id");
    if (employee_id) where.employee_id = employee_id;
    const status = url.searchParams.get("status");
    if (status) where.status = status;
    const where_opt = Object.keys(where).length ? where : undefined;

    const total = await this.requests.count(where_opt);
    const rows = await this.requests.findMany({
      where: where_opt,
      orderBy: { created_at: "desc" },
      limit: q.take,
      offset: q.skip,
    });
    return json({ data: rows.map((r) => this.map_request(r)), total });
  }

  private async create_request(
    req: Request,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    try {
      const input = normalize_leave_request_input(await req.json());
      const days =
        input.days ?? compute_days(input.start_date!, input.end_date!);
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
      await this.requests.insert(rec);
      await this.history.append({
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

  private async patch_request(
    req: Request,
    id: string,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    try {
      const existing = await this.requests.findById(id);
      if (!existing) return not_found(`/leave-requests/${id}`);
      const before = this.map_request(existing);
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
      const { id: _id, created_at: _c, ...patch } = updated;
      await this.requests.updateById(id, patch);
      await this.history.append({
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

  private async delete_request(
    id: string,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    const existing = await this.requests.findById(id);
    if (!existing) return not_found(`/leave-requests/${id}`);
    const before = this.map_request(existing);
    if (before.status !== "pendiente") {
      return error(
        "conflict",
        "Solo se pueden eliminar solicitudes en estado pendiente",
        409,
      );
    }
    await this.requests.deleteById(id);
    await this.history.append({
      resource: "leave_requests",
      record_id: id,
      action: "delete",
      summary: `Solicitud de ausencia eliminada`,
      payload: { before },
      actor: actor_from(identity),
    });
    return json({ data: before });
  }

  private async ensure_balance(
    employee_id: string,
    leave_type_id: string,
    year: number,
  ): Promise<void> {
    const existing = await this.balances.findOne({
      employee_id,
      leave_type_id,
      year,
    });
    if (existing) return;

    const lt = await this.types.findById(leave_type_id);
    const entitled = lt?.max_days_per_year ?? 0;
    await this.balances.insert({
      id: new_id("lb"),
      employee_id,
      leave_type_id,
      year,
      entitled_days: entitled,
      used_days: 0,
    });
  }

  private async decide_request(
    req: Request,
    id: string,
    action: "approve" | "reject" | "cancel",
    identity: KirletIdentity | null,
  ): Promise<Response> {
    const existing = await this.requests.findById(id);
    if (!existing) return not_found(`/leave-requests/${id}`);
    const before = this.map_request(existing);

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
      const year = Number(before.start_date.slice(0, 4));
      await this.ensure_balance(
        before.employee_id,
        before.leave_type_id,
        year,
      );
      const bal = await this.balances.findOne({
        employee_id: before.employee_id,
        leave_type_id: before.leave_type_id,
        year,
      });

      if (bal) {
        const remaining = bal.entitled_days - bal.used_days;
        if (bal.entitled_days > 0 && before.days > remaining) {
          return error(
            "conflict",
            `Saldo insuficiente: quedan ${remaining} día(s)`,
            409,
          );
        }
        await this.balances.updateById(bal.id, {
          used_days: bal.used_days + before.days,
        });
      }

      const updated: LeaveRequest = {
        ...before,
        status: "aprobada",
        decided_by: actor,
        decided_at: iso,
        decision_note: note,
        updated_at: iso,
      };
      await this.requests.updateById(id, {
        status: updated.status,
        decided_by: updated.decided_by,
        decided_at: updated.decided_at,
        decision_note: updated.decision_note,
        updated_at: updated.updated_at,
      });
      await this.history.append({
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
      await this.requests.updateById(id, {
        status: updated.status,
        decided_by: updated.decided_by,
        decided_at: updated.decided_at,
        decision_note: updated.decision_note,
        updated_at: updated.updated_at,
      });
      await this.history.append({
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
    await this.requests.updateById(id, {
      status: updated.status,
      decided_by: updated.decided_by,
      decided_at: updated.decided_at,
      decision_note: updated.decision_note,
      updated_at: updated.updated_at,
    });
    await this.history.append({
      resource: "leave_requests",
      record_id: id,
      action: "cancel",
      summary: `Solicitud cancelada`,
      payload: { before, after: updated },
      actor,
    });
    return json({ data: updated });
  }

  // --- leave-balances ---

  private async handle_balances(
    req: Request,
    path: string,
    url: URL,
    identity: KirletIdentity | null,
  ): Promise<Response | null> {
    if (path === "/leave-balances") {
      if (req.method === "GET") {
        const denied = require_access(identity, "leave", "read");
        if (denied) return denied;
        return this.list_balances(url);
      }
      if (req.method === "POST") {
        const denied = require_access(identity, "leave", "create");
        if (denied) return denied;
        return this.upsert_balance(req, identity);
      }
      return method_not_allowed(["GET", "POST"]);
    }

    const one = path.match(/^\/leave-balances\/([^/]+)$/);
    if (one) {
      if (req.method === "GET") {
        const denied = require_access(identity, "leave", "read");
        if (denied) return denied;
        const r = await this.balances.findById(one[1]!);
        if (!r) return not_found(path);
        return json({ data: this.map_balance(r) });
      }
      if (req.method === "PATCH") {
        const denied = require_access(identity, "leave", "update");
        if (denied) return denied;
        return this.patch_balance(req, one[1]!, identity);
      }
      return method_not_allowed(["GET", "PATCH"]);
    }
    return null;
  }

  private async list_balances(url: URL): Promise<Response> {
    const where: Record<string, string | number> = {};
    const employee_id = url.searchParams.get("employee_id");
    if (employee_id) where.employee_id = employee_id;
    const year = url.searchParams.get("year");
    if (year) where.year = Number(year);
    const where_opt = Object.keys(where).length ? where : undefined;
    const rows = await this.balances.findMany({
      where: where_opt,
      orderBy: { year: "desc" },
    });
    return json({
      data: rows.map((r) => this.map_balance(r)),
      total: rows.length,
    });
  }

  private async upsert_balance(
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
      const existing = await this.balances.findOne({
        employee_id,
        leave_type_id,
        year,
      });

      if (existing) {
        await this.balances.updateById(existing.id, { entitled_days });
        const updated = this.map_balance({ ...existing, entitled_days });
        await this.history.append({
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
      await this.balances.insert(rec);
      await this.history.append({
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

  private async patch_balance(
    req: Request,
    id: string,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    try {
      const existing = await this.balances.findById(id);
      if (!existing) return not_found(`/leave-balances/${id}`);
      const before = this.map_balance(existing);
      const body = (await req.json()) as Record<string, unknown>;
      const entitled_days =
        body.entitled_days !== undefined
          ? Number(body.entitled_days)
          : before.entitled_days;
      const used_days =
        body.used_days !== undefined
          ? Number(body.used_days)
          : before.used_days;
      await this.balances.updateById(id, { entitled_days, used_days });
      const updated = { ...before, entitled_days, used_days };
      await this.history.append({
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
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion LEAVE MODULE
// (o==================================================================o)
