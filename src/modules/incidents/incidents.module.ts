// (o==================================================================o)
//   #region INCIDENTS MODULE (class + kit repository)
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
  can_transition_incident_status,
  normalize_incident_input,
  type Incident,
  type IncidentStatus,
} from "./schema.ts";
import { build_incidents_page } from "./descriptors.ts";

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

const ACTION_STATUS: Record<string, IncidentStatus> = {
  review: "en_revision",
  start: "en_proceso",
  resolve: "resuelta",
  close: "cerrada",
  cancel: "cancelada",
  reopen: "abierta",
};

export class IncidentsModule extends KirletModule {
  private readonly incidents: KirletRepository<Incident>;
  private readonly employees: KirletRepository;
  private readonly history: HistoryService;

  constructor(data: KirletDataClient) {
    super(data);
    this.incidents = new KirletRepository(data, "incidents");
    this.employees = new KirletRepository(data, "employees");
    this.history = new HistoryService(data);
  }

  pages() {
    return [
      {
        id: "hr.incidents",
        path: "incidents",
        permission: "kirlet.hr.incidents.read",
        build: build_incidents_page as () => NoxPageDescriptor,
      },
    ];
  }

  override async handle(ctx: KirletRouteContext): Promise<Response | null> {
    const { req, path, url, identity } = ctx;

    const action = path.match(
      /^\/incidents\/([^/]+)\/(review|start|resolve|close|cancel|reopen)$/,
    );
    if (action) {
      if (req.method !== "POST") return method_not_allowed(["POST"]);
      const denied = require_access(identity, "incidents", "update");
      if (denied) return denied;
      return this.transition(req, action[1]!, action[2]!, identity);
    }

    const one = path.match(/^\/incidents\/([^/]+)$/);
    if (one) {
      const id = one[1]!;
      if (req.method === "GET") {
        const denied = require_access(identity, "incidents", "read");
        if (denied) return denied;
        return this.get_one(id);
      }
      if (req.method === "PATCH") {
        const denied = require_access(identity, "incidents", "update");
        if (denied) return denied;
        return this.patch_one(req, id, identity);
      }
      if (req.method === "DELETE") {
        const denied = require_access(identity, "incidents", "delete");
        if (denied) return denied;
        return this.soft_delete(id, identity);
      }
      return method_not_allowed(["GET", "PATCH", "DELETE"]);
    }

    if (path === "/incidents") {
      if (req.method === "GET") {
        const denied = require_access(identity, "incidents", "read");
        if (denied) return denied;
        return this.list(url);
      }
      if (req.method === "POST") {
        const denied = require_access(identity, "incidents", "create");
        if (denied) return denied;
        return this.create(req, identity);
      }
      return method_not_allowed(["GET", "POST"]);
    }

    return null;
  }

  private map_row(r: Record<string, unknown>): Incident {
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

  private async next_folio(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INC-${year}-`;
    const rows = await this.incidents.findMany({
      where: { folio: { like: `${prefix}%` } },
      orderBy: { folio: "desc" },
      limit: 1,
    });
    let n = 1;
    const folio = rows[0]?.folio;
    if (folio) {
      const m = String(folio).match(/-(\d+)$/);
      if (m) n = Number(m[1]) + 1;
    }
    return `${prefix}${String(n).padStart(4, "0")}`;
  }

  private async ensure_employee(
    employee_id: string | null | undefined,
  ): Promise<Response | null> {
    if (!employee_id) return null;
    const exists = await this.employees.findById(employee_id);
    if (!exists) {
      return error("validation_error", "employee_id no existe", 400);
    }
    return null;
  }

  private async list(url: URL): Promise<Response> {
    const q = parse_list_query(url.searchParams);
    const include_inactive = url.searchParams.get("include_inactive") === "1";
    const status = url.searchParams.get("status")?.trim();
    const type = url.searchParams.get("type")?.trim();
    const severity = url.searchParams.get("severity")?.trim();
    const employee_id = url.searchParams.get("employee_id")?.trim();

    const where: Record<string, string | number> = {};
    if (!include_inactive) where.is_active = 1;
    if (status) where.status = status;
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (employee_id) where.employee_id = employee_id;
    const where_opt = Object.keys(where).length ? where : undefined;

    const search = q.q
      ? {
          fields: [
            "title",
            "folio",
            "description",
            "location",
            "reported_by",
          ],
          q: q.q,
        }
      : undefined;

    let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
    if (q.sort) {
      const [col, dir] = q.sort.split(":");
      if (col && SORTABLE.has(col) && (dir === "asc" || dir === "desc")) {
        orderBy = { [col]: dir };
      }
    }

    const all_for_total = search
      ? await this.incidents.findMany({ where: where_opt, search, limit: 10000 })
      : null;
    const total = all_for_total
      ? all_for_total.length
      : await this.incidents.count(where_opt);

    const rows = await this.incidents.findMany({
      where: where_opt,
      search,
      orderBy,
      limit: q.take,
      offset: q.skip,
    });

    return json({ data: rows.map((r) => this.map_row(r)), total });
  }

  private async get_one(id: string): Promise<Response> {
    const row = await this.incidents.findById(id);
    if (!row) return not_found(`/incidents/${id}`);
    return json({ data: this.map_row(row) });
  }

  private async create(
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
      const emp_err = await this.ensure_employee(input.employee_id);
      if (emp_err) return emp_err;

      const id = new_id("inc");
      const iso = now_iso();
      const folio = await this.next_folio();
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

      await this.incidents.insert(row);
      await this.history.append({
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

  private async patch_one(
    req: Request,
    id: string,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    try {
      const existing = await this.incidents.findById(id);
      if (!existing) return not_found(`/incidents/${id}`);
      const before = this.map_row(existing);
      const input = normalize_incident_input(await req.json(), true);

      if (input.employee_id !== undefined) {
        const emp_err = await this.ensure_employee(input.employee_id);
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
        } else if (
          before.status === "cerrada" ||
          before.status === "cancelada"
        ) {
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

      const { id: _id, created_at: _c, ...patch } = updated;
      await this.incidents.updateById(id, patch);
      await this.history.append({
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

  private async soft_delete(
    id: string,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    const existing = await this.incidents.findById(id);
    if (!existing) return not_found(`/incidents/${id}`);
    const before = this.map_row(existing);
    const iso = now_iso();
    const after: Incident = {
      ...before,
      is_active: 0,
      status:
        before.status === "cerrada" || before.status === "cancelada"
          ? before.status
          : "cancelada",
      closed_at: before.closed_at ?? iso,
      updated_at: iso,
    };
    await this.incidents.updateById(id, {
      is_active: after.is_active,
      status: after.status,
      closed_at: after.closed_at,
      updated_at: after.updated_at,
    });
    await this.history.append({
      resource: "incidents",
      record_id: id,
      action: "delete",
      summary: `Incidencia desactivada: ${before.folio}`,
      payload: { before, after },
      actor: actor_from(identity),
    });
    return json({ data: after });
  }

  private async transition(
    req: Request,
    id: string,
    action: string,
    identity: KirletIdentity | null,
  ): Promise<Response> {
    const target = ACTION_STATUS[action];
    if (!target) {
      return error("validation_error", `Acción desconocida: ${action}`, 400);
    }

    const existing = await this.incidents.findById(id);
    if (!existing) return not_found(`/incidents/${id}`);
    const before = this.map_row(existing);

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

    await this.incidents.updateById(id, {
      status: target,
      resolution_note: note,
      closed_at,
      updated_at: iso,
    });

    const after: Incident = {
      ...before,
      status: target,
      resolution_note: note,
      closed_at,
      updated_at: iso,
    };

    await this.history.append({
      resource: "incidents",
      record_id: id,
      action: "update",
      summary: `Incidencia ${action}: ${before.folio} → ${target}`,
      payload: { before, after },
      actor: actor_from(identity),
    });

    return json({ data: after });
  }
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion INCIDENTS MODULE
// (o==================================================================o)
