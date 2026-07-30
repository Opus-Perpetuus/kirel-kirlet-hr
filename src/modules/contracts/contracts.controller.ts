// (o==================================================================o)
//   #region CONTRACTS HELPERS
// (o-----------------------------------------------------------\/-----o)

import {
  KirletHttpError,
  today_iso,
  type DomainRow,
  type KirletCtx,
} from "@opus-perpetuus/kirel-nox-kit";

export const CONTRACT_TYPES = [
  "indeterminado",
  "determinado",
  "obra",
  "capacitacion",
  "temporada",
] as const;

export const CONTRACT_SCHEDULES = ["completa", "parcial"] as const;
export const CONTRACT_STATUSES = ["activo", "vencido", "terminado"] as const;

export function effective_status(
  status: string,
  end_date: string | null,
  today = today_iso(),
): string {
  if (status === "activo" && end_date && end_date < today) {
    return "vencido";
  }
  return status;
}

export async function prepare_contract_create(
  ctx: KirletCtx,
  row: DomainRow,
): Promise<DomainRow> {
  const employee_id = String(row["employee_id"] ?? "").trim();
  if (!employee_id) {
    throw new KirletHttpError(400, "validation_error", "employee_id es requerido", {
      field: "employee_id",
    });
  }
  const emp = await ctx.data.findOne("employees", { id: employee_id });
  if (!emp) {
    throw new KirletHttpError(400, "validation_error", "employee_id no existe", {
      field: "employee_id",
    });
  }
  const type = String(row["type"] ?? "").trim();
  if (!(CONTRACT_TYPES as readonly string[]).includes(type)) {
    throw new KirletHttpError(400, "validation_error", `type inválido: ${type}`, {
      field: "type",
    });
  }
  const end_date =
    row["end_date"] == null || row["end_date"] === ""
      ? null
      : String(row["end_date"]);
  let status = String(row["status"] ?? "activo");
  status = effective_status(status, end_date);
  return {
    ...row,
    employee_id,
    type,
    end_date,
    salary: row["salary"] ?? 0,
    currency: row["currency"] ?? "MXN",
    schedule: row["schedule"] ?? "completa",
    status,
    notes: row["notes"] ?? null,
  };
}

export async function prepare_contract_update(
  _ctx: KirletCtx,
  _id: string,
  patch: DomainRow,
  existing: DomainRow,
): Promise<DomainRow> {
  const end_date =
    patch["end_date"] !== undefined
      ? patch["end_date"] == null || patch["end_date"] === ""
        ? null
        : String(patch["end_date"])
      : ((existing["end_date"] as string) ?? null);
  let status =
    patch["status"] !== undefined
      ? String(patch["status"])
      : String(existing["status"]);
  status = effective_status(status, end_date);
  return { ...patch, end_date, status };
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion CONTRACTS HELPERS
// (o==================================================================o)
