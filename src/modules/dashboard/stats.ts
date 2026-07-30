// (o==================================================================o)
//   #region DASHBOARD STATS (kit repository — no SQL)
// (o-----------------------------------------------------------\/-----o)

import {
  KirletRepository,
  type KirletDataClient,
} from "@opus-perpetuus/kirel-nox-kit";
import { today_iso } from "../../http.ts";

export type DashboardStats = {
  empleados_activos: number;
  solicitudes_pendientes: number;
  contratos_por_vencer_30d: number;
  contratos_vencidos: number;
};

function add_days(iso_date: string, days: number): string {
  const d = new Date(`${iso_date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Real counts for the HR panel (kit-mediated). */
export async function compute_dashboard_stats(
  data: KirletDataClient,
): Promise<DashboardStats> {
  const employees = new KirletRepository(data, "employees");
  const leave_requests = new KirletRepository(data, "leave_requests");
  const contracts = new KirletRepository(data, "contracts");

  const empleados_activos = await employees.count({ is_active: 1 });
  const solicitudes_pendientes = await leave_requests.count({
    status: "pendiente",
  });

  const today = today_iso();
  const horizon = add_days(today, 30);
  const all_contracts = await contracts.findMany({ limit: 10000 });

  let contratos_por_vencer_30d = 0;
  let contratos_vencidos = 0;
  for (const c of all_contracts) {
    const status = String(c.status);
    const end_date = (c.end_date as string) ?? null;
    const effective =
      status === "activo" && end_date && end_date < today
        ? "vencido"
        : status;

    if (effective === "vencido") {
      contratos_vencidos++;
    }
    if (
      status === "activo" &&
      end_date != null &&
      end_date >= today &&
      end_date <= horizon
    ) {
      contratos_por_vencer_30d++;
    }
  }

  return {
    empleados_activos,
    solicitudes_pendientes,
    contratos_por_vencer_30d,
    contratos_vencidos,
  };
}

export function stats_as_rows(
  stats: DashboardStats,
): Array<{ metric: string; value: number }> {
  return [
    { metric: "Empleados activos", value: stats.empleados_activos },
    { metric: "Solicitudes pendientes", value: stats.solicitudes_pendientes },
    {
      metric: "Contratos por vencer (30 d)",
      value: stats.contratos_por_vencer_30d,
    },
    { metric: "Contratos vencidos", value: stats.contratos_vencidos },
  ];
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DASHBOARD STATS
// (o==================================================================o)
