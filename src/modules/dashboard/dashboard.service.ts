// (o==================================================================o)
//   #region DASHBOARD STATS
// (o-----------------------------------------------------------\/-----o)

import {
  today_iso,
  type KirletDataClient,
  type KirletCtx,
} from "@opus-perpetuus/kirel-nox-kit";

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

/** Real counts for the HR panel. */
export async function compute_dashboard_stats(
  data: KirletDataClient,
): Promise<DashboardStats> {
  const empleados_activos = await data.count("employees", { active: true });
  const solicitudes_pendientes = await data.count("leave_requests", {
    status: "pendiente",
  });

  const today = today_iso();
  const horizon = add_days(today, 30);
  const all_contracts = await data.findMany("contracts", { limit: 10000 });

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

export async function dashboard_stats_handler(ctx: KirletCtx) {
  const data = await compute_dashboard_stats(ctx.data);
  return {
    data,
    rows: stats_as_rows(data),
  };
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DASHBOARD STATS
// (o==================================================================o)
