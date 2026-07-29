// (o==================================================================o)
//   #region EMPLOYEES SCHEMA
// (o-----------------------------------------------------------\/-----o)

export type Employee = {
  id: string;
  name: string;
  full_name: string;
  email: string;
  department_id: string | null;
  position_id: string | null;
  manager_id: string | null;
  /** Optional platform (NOX) user id — not a SQLite FK across processes. */
  user_id: string | null;
  hired_at: string | null;
  phone: string | null;
  rfc: string | null;
  curp: string | null;
  nss: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type EmployeeInput = {
  name?: string;
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
  is_active?: boolean | number;
};

export function normalize_employee_input(
  body: unknown,
  partial = false,
): Partial<EmployeeInput> & { full_name?: string; email?: string } {
  if (!body || typeof body !== "object") {
    throw new Error("El cuerpo debe ser un objeto JSON");
  }
  const b = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if (b.full_name !== undefined || b.name !== undefined || !partial) {
    const full_name = String(b.full_name ?? b.name ?? "").trim();
    if (!full_name && !partial) throw new Error("full_name es requerido");
    if (full_name) {
      out.full_name = full_name;
      out.name = String(b.name ?? full_name).trim() || full_name;
    }
  }

  if (b.email !== undefined || !partial) {
    const email = String(b.email ?? "")
      .trim()
      .toLowerCase();
    if ((!email || !email.includes("@")) && !partial) {
      throw new Error("correo electrónico válido es requerido");
    }
    if (email) out.email = email;
  }

  for (const key of [
    "department_id",
    "position_id",
    "manager_id",
    "user_id",
    "hired_at",
    "phone",
    "rfc",
    "curp",
    "nss",
  ] as const) {
    if (b[key] !== undefined) {
      const v = b[key];
      out[key] = v == null || v === "" ? null : String(v).trim() || null;
    }
  }

  if (b.is_active !== undefined) {
    out.is_active =
      b.is_active === true || b.is_active === 1 || b.is_active === "1" ? 1 : 0;
  }

  return out as Partial<EmployeeInput>;
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion EMPLOYEES SCHEMA
// (o==================================================================o)
