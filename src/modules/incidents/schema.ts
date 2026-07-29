// (o==================================================================o)
//   #region INCIDENTS SCHEMA
// (o-----------------------------------------------------------\/-----o)

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

export type IncidentType = (typeof INCIDENT_TYPES)[number];
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export type Incident = {
  id: string;
  folio: string;
  title: string;
  description: string | null;
  employee_id: string | null;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurred_at: string | null;
  location: string | null;
  reported_by: string | null;
  assigned_to: string | null;
  resolution_note: string | null;
  closed_at: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

const TYPE_SET = new Set<string>(INCIDENT_TYPES);
const SEV_SET = new Set<string>(INCIDENT_SEVERITIES);
const STATUS_SET = new Set<string>(INCIDENT_STATUSES);

/** Allowed status transitions (from → to[]). Terminal: cerrada, cancelada. */
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
): Partial<Incident> {
  if (!body || typeof body !== "object") {
    throw new Error("El cuerpo debe ser un objeto JSON");
  }
  const b = body as Record<string, unknown>;
  const out: Partial<Incident> = {};

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
      if (!TYPE_SET.has(type)) {
        throw new Error(
          `type inválido (use: ${INCIDENT_TYPES.join(", ")})`,
        );
      }
      out.type = type as IncidentType;
    } else if (!partial) {
      out.type = "otro";
    }
  }

  if (b.severity !== undefined || !partial) {
    const severity = String(b.severity ?? (partial ? "" : "media")).trim();
    if (severity) {
      if (!SEV_SET.has(severity)) {
        throw new Error(
          `severity inválido (use: ${INCIDENT_SEVERITIES.join(", ")})`,
        );
      }
      out.severity = severity as IncidentSeverity;
    } else if (!partial) {
      out.severity = "media";
    }
  }

  if (b.status !== undefined) {
    const status = String(b.status ?? "").trim();
    if (status) {
      if (!STATUS_SET.has(status)) {
        throw new Error(
          `status inválido (use: ${INCIDENT_STATUSES.join(", ")})`,
        );
      }
      out.status = status as IncidentStatus;
    }
  }

  if (b.occurred_at !== undefined) {
    out.occurred_at =
      b.occurred_at == null || b.occurred_at === ""
        ? null
        : String(b.occurred_at).trim();
  }

  if (b.location !== undefined) {
    const loc = b.location == null ? null : String(b.location).trim();
    out.location = loc || null;
  }

  if (b.reported_by !== undefined) {
    const r = b.reported_by == null ? null : String(b.reported_by).trim();
    out.reported_by = r || null;
  }

  if (b.assigned_to !== undefined) {
    const a = b.assigned_to == null ? null : String(b.assigned_to).trim();
    out.assigned_to = a || null;
  }

  if (b.resolution_note !== undefined) {
    const n =
      b.resolution_note == null ? null : String(b.resolution_note).trim();
    out.resolution_note = n || null;
  }

  return out;
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion INCIDENTS SCHEMA
// (o==================================================================o)
