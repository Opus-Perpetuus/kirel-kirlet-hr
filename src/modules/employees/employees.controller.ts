// (o==================================================================o)
//   #region EMPLOYEES CONTROLLER (normalize + team)
// (o-----------------------------------------------------------\/-----o)

import {
  KirletHttpError,
  today_iso,
  type DomainRow,
  type KirletCtx,
} from "@opus-perpetuus/kirel-nox-kit";

export function normalize_employee_input(
  body: unknown,
  partial = false,
): Partial<{
  name: string;
  full_name: string;
  email: string;
  department_id: string | null;
  position_id: string | null;
  manager_id: string | null;
  user_id: string | null;
  hired_at: string | null;
  phone: string | null;
  rfc: string | null;
  curp: string | null;
  nss: string | null;
  active: boolean;
}> {
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

  if (b.active !== undefined || b.is_active !== undefined) {
    const raw = b.active !== undefined ? b.active : b.is_active;
    out.active =
      raw === true || raw === 1 || raw === "1" || raw === "true";
  }

  return out as ReturnType<typeof normalize_employee_input>;
}

export async function prepare_employee_create(
  ctx: KirletCtx,
  row: DomainRow,
): Promise<DomainRow> {
  const full_name = String(row["full_name"] ?? row["name"] ?? "").trim();
  if (!full_name) {
    throw new KirletHttpError(400, "validation_error", "full_name es requerido", {
      field: "full_name",
    });
  }
  const email = String(row["email"] ?? "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) {
    throw new KirletHttpError(
      400,
      "validation_error",
      "correo electrónico válido es requerido",
      { field: "email" },
    );
  }
  const existing = await ctx.data.findOne("employees", { email });
  if (existing) {
    throw new KirletHttpError(409, "conflict", "El correo ya está registrado");
  }
  return {
    ...row,
    full_name,
    name: String(row["name"] ?? full_name).trim() || full_name,
    email,
    hired_at: row["hired_at"] ?? today_iso(),
    department_id: row["department_id"] ?? null,
    position_id: row["position_id"] ?? null,
    manager_id: row["manager_id"] ?? null,
    user_id: row["user_id"] ?? null,
    phone: row["phone"] ?? null,
    rfc: row["rfc"] ?? null,
    curp: row["curp"] ?? null,
    nss: row["nss"] ?? null,
  };
}

export async function prepare_employee_update(
  ctx: KirletCtx,
  id: string,
  patch: DomainRow,
  existing: DomainRow,
): Promise<DomainRow> {
  if (patch["email"] != null) {
    const email = String(patch["email"]).trim().toLowerCase();
    patch["email"] = email;
    if (email !== existing["email"]) {
      const dup = await ctx.data.findOne("employees", { email });
      if (dup && String(dup.id) !== id) {
        throw new KirletHttpError(
          409,
          "conflict",
          "El correo ya está registrado",
        );
      }
    }
  }
  if (patch["full_name"] != null && patch["name"] == null) {
    patch["name"] = String(patch["full_name"]).trim();
  }
  return patch;
}

export async function get_employee_team(
  ctx: KirletCtx,
): Promise<{ data: DomainRow[] }> {
  const id = ctx.params.id;
  const manager = await ctx.data.findOne("employees", { id });
  if (!manager) {
    throw new KirletHttpError(404, "not_found", "not found");
  }
  const rows = await ctx.data.findMany("employees", {
    where: { manager_id: id, active: true },
    orderBy: { name: "asc" },
  });
  return { data: rows };
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion EMPLOYEES CONTROLLER
// (o==================================================================o)
