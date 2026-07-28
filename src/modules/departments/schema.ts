// (o==================================================================o)
//   #region DEPARTMENTS SCHEMA
// (o-----------------------------------------------------------\/-----o)

export type Department = {
  id: string;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export function normalize_department_input(
  body: unknown,
  partial = false,
): { name?: string; description?: string | null; is_active?: number } {
  if (!body || typeof body !== "object") {
    throw new Error("El cuerpo debe ser un objeto JSON");
  }
  const b = body as Record<string, unknown>;
  const out: {
    name?: string;
    description?: string | null;
    is_active?: number;
  } = {};

  if (b.name !== undefined || !partial) {
    const name = String(b.name ?? "").trim();
    if (!name && !partial) throw new Error("name es requerido");
    if (name) out.name = name;
  }
  if (b.description !== undefined) {
    out.description =
      b.description == null || b.description === ""
        ? null
        : String(b.description);
  }
  if (b.is_active !== undefined) {
    out.is_active =
      b.is_active === true || b.is_active === 1 || b.is_active === "1" ? 1 : 0;
  }
  return out;
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DEPARTMENTS SCHEMA
// (o==================================================================o)
