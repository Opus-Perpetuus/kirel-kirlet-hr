// (o==================================================================o)
//   #region INCIDENTS CONTROLLER (workflow + normalize)
// (o-----------------------------------------------------------\/-----o)

import {
  KirletHttpError,
  now_iso,
  type DomainRow,
  type KirletCtx,
} from "@opus-perpetuus/kirel-nox-kit";

export const INCIDENT_TYPES = [
  "accidente",
  "enfermedad",
  "disciplina",
  "queja",
  "mejora",
  "seguridad",
  "otro",
] as const;

export const INCIDENT_SEVERITIES = [
  "baja",
  "media",
  "alta",
  "critica",
] as const;

export const INCIDENT_STATUSES = [
  "abierta",
  "en_revision",
  "en_proceso",
  "resuelta",
  "cerrada",
  "cancelada",
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_STATUS_TRANSITIONS: Record<
  IncidentStatus,
  readonly IncidentStatus[]
> = {
  abierta: ["en_revision", "en_proceso", "cancelada"],
  en_revision: ["en_proceso", "resuelta", "cancelada", "abierta"],
  en_proceso: ["resuelta", "en_revision", "cancelada"],
  resuelta: ["cerrada", "en_proceso"],
  cerrada: [],
  cancelada: [],
};

const ACTION_STATUS: Record<string, IncidentStatus> = {
  review: "en_revision",
  start: "en_proceso",
  resolve: "resuelta",
  close: "cerrada",
  cancel: "cancelada",
  reopen: "abierta",
};

export function can_transition_incident_status(
  from: string,
  to: string,
): boolean {
  if (from === to) return true;
  const allowed = INCIDENT_STATUS_TRANSITIONS[from as IncidentStatus];
  if (!allowed) return false;
  return allowed.includes(to as IncidentStatus);
}

export function normalize_incident_input(
  body: unknown,
  partial = false,
): Partial<DomainRow> {
  if (!body || typeof body !== "object") {
    throw new Error("El cuerpo debe ser un objeto JSON");
  }
  const b = body as Record<string, unknown>;
  const out: DomainRow = {};

  if (b.title !== undefined || !partial) {
    const title = String(b.title ?? "").trim();
    if (!title && !partial) throw new Error("title es requerido");
    if (title) out.title = title;
  }

  if (b.description !== undefined) {
    const d = b.description == null ? null : String(b.description).trim();
    out.description = d || null;
  }

  if (b.employee_id !== undefined) {
    if (b.employee_id == null || b.employee_id === "") {
      out.employee_id = null;
    } else {
      out.employee_id = String(b.employee_id).trim() || null;
    }
  }

  if (b.type !== undefined || !partial) {
    const type = String(b.type ?? (partial ? "" : "otro")).trim();
    if (type) {
      if (!(INCIDENT_TYPES as readonly string[]).includes(type)) {
        throw new Error(
          `type inválido (use: ${INCIDENT_TYPES.join(", ")})`,
        );
      }
      out.type = type;
    } else if (!partial) {
      out.type = "otro";
    }
  }

  if (b.severity !== undefined || !partial) {
    const severity = String(b.severity ?? (partial ? "" : "media")).trim();
    if (severity) {
      if (!(INCIDENT_SEVERITIES as readonly string[]).includes(severity)) {
        throw new Error(
          `severity inválido (use: ${INCIDENT_SEVERITIES.join(", ")})`,
        );
      }
      out.severity = severity;
    } else if (!partial) {
      out.severity = "media";
    }
  }

  if (b.status !== undefined) {
    const status = String(b.status ?? "").trim();
    if (status) {
      if (!(INCIDENT_STATUSES as readonly string[]).includes(status)) {
        throw new Error(
          `status inválido (use: ${INCIDENT_STATUSES.join(", ")})`,
        );
      }
      out.status = status;
    }
  }

  for (const key of [
    "occurred_at",
    "location",
    "reported_by",
    "assigned_to",
    "resolution_note",
  ] as const) {
    if (b[key] !== undefined) {
      const v = b[key];
      out[key] = v == null || v === "" ? null : String(v).trim() || null;
    }
  }

  return out;
}

export async function prepare_incident_create(
  ctx: KirletCtx,
  row: DomainRow,
): Promise<DomainRow> {
  const title = String(row["title"] ?? "").trim();
  if (!title) {
    throw new KirletHttpError(400, "validation_error", "title es requerido", {
      field: "title",
    });
  }
  if (row["employee_id"]) {
    const emp = await ctx.data.findOne("employees", {
      id: String(row["employee_id"]),
    });
    if (!emp) {
      throw new KirletHttpError(
        400,
        "validation_error",
        "employee_id no existe",
        { field: "employee_id" },
      );
    }
  }
  const type = String(row["type"] ?? "otro");
  if (!(INCIDENT_TYPES as readonly string[]).includes(type)) {
    throw new KirletHttpError(400, "validation_error", `type inválido: ${type}`);
  }
  const severity = String(row["severity"] ?? "media");
  if (!(INCIDENT_SEVERITIES as readonly string[]).includes(severity)) {
    throw new KirletHttpError(
      400,
      "validation_error",
      `severity inválido: ${severity}`,
    );
  }
  const year = new Date().getFullYear();
  const folio = await ctx.nox.counters.next(`incidents-${year}`, {
    prefix: `INC-${year}-`,
    pad_length: 4,
  });
  return {
    ...row,
    title,
    folio,
    type,
    severity,
    status: row["status"] ?? "abierta",
    description: row["description"] ?? null,
    employee_id: row["employee_id"] ?? null,
    occurred_at: row["occurred_at"] ?? null,
    location: row["location"] ?? null,
    reported_by: row["reported_by"] ?? ctx.actor,
    assigned_to: row["assigned_to"] ?? null,
    resolution_note: null,
    closed_at: null,
  };
}

export async function prepare_incident_update(
  ctx: KirletCtx,
  _id: string,
  patch: DomainRow,
  existing: DomainRow,
): Promise<DomainRow> {
  if (patch["employee_id"] != null && patch["employee_id"] !== "") {
    const emp = await ctx.data.findOne("employees", {
      id: String(patch["employee_id"]),
    });
    if (!emp) {
      throw new KirletHttpError(
        400,
        "validation_error",
        "employee_id no existe",
        { field: "employee_id" },
      );
    }
  }
  if (patch["status"] != null && patch["status"] !== existing["status"]) {
    if (
      !can_transition_incident_status(
        String(existing["status"]),
        String(patch["status"]),
      )
    ) {
      throw new KirletHttpError(
        400,
        "invalid_transition",
        `No se puede pasar de ${existing["status"]} a ${patch["status"]}`,
      );
    }
    const status = String(patch["status"]);
    if (status === "cerrada" || status === "cancelada") {
      patch["closed_at"] = now_iso();
    } else if (
      existing["status"] === "cerrada" ||
      existing["status"] === "cancelada"
    ) {
      patch["closed_at"] = null;
    }
  }
  return patch;
}

export async function transition_incident(
  ctx: KirletCtx,
  action: string,
): Promise<{ data: DomainRow }> {
  const target = ACTION_STATUS[action];
  if (!target) {
    throw new KirletHttpError(
      400,
      "validation_error",
      `Acción desconocida: ${action}`,
    );
  }
  const id = ctx.params.id;
  const existing = await ctx.data.findOne("incidents", { id });
  if (!existing) throw new KirletHttpError(404, "not_found", "not found");
  const before = { ...existing };

  if (!can_transition_incident_status(String(before["status"]), target)) {
    throw new KirletHttpError(
      400,
      "invalid_transition",
      `No se puede ${action}: ${before["status"]} → ${target}`,
    );
  }

  let note: string | null = (before["resolution_note"] as string) ?? null;
  try {
    const body = (await ctx.body<{
      resolution_note?: string;
      note?: string;
    }>()) ?? {};
    note =
      body.resolution_note?.trim() ||
      body.note?.trim() ||
      note;
  } catch {
    /* keep */
  }

  const iso = now_iso();
  const closed_at =
    target === "cerrada" || target === "cancelada" ? iso : null;

  await ctx.data.update("incidents", { id }, {
    status: target,
    resolution_note: note,
    closed_at,
    updated_at: iso,
  });

  const after: DomainRow = {
    ...before,
    status: target,
    resolution_note: note,
    closed_at,
    updated_at: iso,
  };

  await ctx.nox.history.append({
    resource: "incidents",
    action: "update",
    entity_id: id,
    actor_id: ctx.identity?.user_id ?? null,
    actor_label: ctx.actor,
    payload: { before, after },
  });

  return { data: after };
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion INCIDENTS CONTROLLER
// (o==================================================================o)
