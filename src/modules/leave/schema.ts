// (o==================================================================o)
//   #region LEAVE SCHEMA
// (o-----------------------------------------------------------\/-----o)

export const LEAVE_REQUEST_STATUSES = [
  "pendiente",
  "aprobada",
  "rechazada",
  "cancelada",
] as const;

export type LeaveType = {
  id: string;
  name: string;
  paid: number;
  max_days_per_year: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
  updated_at: string;
};

export type LeaveBalance = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  entitled_days: number;
  used_days: number;
};

export function normalize_leave_type_input(
  body: unknown,
  partial = false,
): Partial<LeaveType> {
  if (!body || typeof body !== "object") {
    throw new Error("El cuerpo debe ser un objeto JSON");
  }
  const b = body as Record<string, unknown>;
  const out: Partial<LeaveType> = {};
  if (b.name !== undefined || !partial) {
    const name = String(b.name ?? "").trim();
    if (!name && !partial) throw new Error("name es requerido");
    if (name) out.name = name;
  }
  if (b.paid !== undefined) {
    out.paid =
      b.paid === true || b.paid === 1 || b.paid === "1" ? 1 : 0;
  }
  if (b.max_days_per_year !== undefined) {
    out.max_days_per_year =
      b.max_days_per_year == null || b.max_days_per_year === ""
        ? null
        : Number(b.max_days_per_year);
  }
  if (b.is_active !== undefined) {
    out.is_active =
      b.is_active === true || b.is_active === 1 || b.is_active === "1" ? 1 : 0;
  }
  return out;
}

export function normalize_leave_request_input(
  body: unknown,
  partial = false,
): Partial<LeaveRequest> {
  if (!body || typeof body !== "object") {
    throw new Error("El cuerpo debe ser un objeto JSON");
  }
  const b = body as Record<string, unknown>;
  const out: Partial<LeaveRequest> = {};

  if (b.employee_id !== undefined || !partial) {
    const employee_id = String(b.employee_id ?? "").trim();
    if (!employee_id && !partial) throw new Error("employee_id es requerido");
    if (employee_id) out.employee_id = employee_id;
  }
  if (b.leave_type_id !== undefined || !partial) {
    const leave_type_id = String(b.leave_type_id ?? "").trim();
    if (!leave_type_id && !partial)
      throw new Error("leave_type_id es requerido");
    if (leave_type_id) out.leave_type_id = leave_type_id;
  }
  if (b.start_date !== undefined || !partial) {
    const start_date = String(b.start_date ?? "").trim();
    if (!start_date && !partial) throw new Error("start_date es requerido");
    if (start_date) out.start_date = start_date;
  }
  if (b.end_date !== undefined || !partial) {
    const end_date = String(b.end_date ?? "").trim();
    if (!end_date && !partial) throw new Error("end_date es requerido");
    if (end_date) out.end_date = end_date;
  }
  if (b.days !== undefined || !partial) {
    if (b.days === undefined && !partial) {
      // computed later if missing
    } else if (b.days !== undefined) {
      const days = Number(b.days);
      if (!Number.isFinite(days) || days <= 0) {
        throw new Error("days debe ser un número > 0");
      }
      out.days = days;
    }
  }
  if (b.reason !== undefined) {
    out.reason =
      b.reason == null || b.reason === "" ? null : String(b.reason);
  }
  return out;
}

export function compute_days(start: string, end: string): number {
  const a = Date.parse(start);
  const b = Date.parse(end);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) {
    throw new Error("rango de fechas inválido");
  }
  const ms = b - a;
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion LEAVE SCHEMA
// (o==================================================================o)
