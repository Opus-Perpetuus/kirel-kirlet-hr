// (o==================================================================o)
//   #region CONTRACTS SCHEMA
// (o-----------------------------------------------------------\/-----o)

export const CONTRACT_TYPES = [
  "indeterminado",
  "determinado",
  "obra",
  "capacitacion",
  "temporada",
] as const;

export const CONTRACT_SCHEDULES = ["completa", "parcial"] as const;
export const CONTRACT_STATUSES = ["activo", "vencido", "terminado"] as const;

export type Contract = {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string | null;
  salary: number;
  currency: string;
  schedule: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function normalize_contract_input(
  body: unknown,
  partial = false,
): Partial<Contract> {
  if (!body || typeof body !== "object") {
    throw new Error("El cuerpo debe ser un objeto JSON");
  }
  const b = body as Record<string, unknown>;
  const out: Partial<Contract> = {};

  if (b.employee_id !== undefined || !partial) {
    const employee_id = String(b.employee_id ?? "").trim();
    if (!employee_id && !partial) throw new Error("employee_id es requerido");
    if (employee_id) out.employee_id = employee_id;
  }

  if (b.type !== undefined || !partial) {
    const type = String(b.type ?? "").trim();
    if (!type && !partial) throw new Error("type es requerido");
    if (type) {
      if (!(CONTRACT_TYPES as readonly string[]).includes(type)) {
        throw new Error(`type inválido: ${type}`);
      }
      out.type = type;
    }
  }

  if (b.start_date !== undefined || !partial) {
    const start_date = String(b.start_date ?? "").trim();
    if (!start_date && !partial) throw new Error("start_date es requerido");
    if (start_date) out.start_date = start_date;
  }

  if (b.end_date !== undefined) {
    out.end_date =
      b.end_date == null || b.end_date === "" ? null : String(b.end_date);
  }

  if (b.salary !== undefined) {
    const salary = Number(b.salary);
    if (!Number.isFinite(salary) || salary < 0) {
      throw new Error("salary debe ser un número ≥ 0");
    }
    out.salary = salary;
  }

  if (b.currency !== undefined) {
    out.currency = String(b.currency || "MXN");
  }

  if (b.schedule !== undefined) {
    const schedule = String(b.schedule);
    if (!(CONTRACT_SCHEDULES as readonly string[]).includes(schedule)) {
      throw new Error(`schedule inválido: ${schedule}`);
    }
    out.schedule = schedule;
  }

  if (b.status !== undefined) {
    const status = String(b.status);
    if (!(CONTRACT_STATUSES as readonly string[]).includes(status)) {
      throw new Error(`status inválido: ${status}`);
    }
    out.status = status;
  }

  if (b.notes !== undefined) {
    out.notes =
      b.notes == null || b.notes === "" ? null : String(b.notes);
  }

  return out;
}

/** Mark status vencido when end_date is before today and still activo. */
export function effective_status(
  status: string,
  end_date: string | null,
  today = new Date().toISOString().slice(0, 10),
): string {
  if (status === "activo" && end_date && end_date < today) {
    return "vencido";
  }
  return status;
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion CONTRACTS SCHEMA
// (o==================================================================o)
