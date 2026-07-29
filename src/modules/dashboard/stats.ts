// (o==================================================================o)
//   #region DASHBOARD STATS (pure queries)
// (o-----------------------------------------------------------\/-----o)

import type { Database } from "bun:sqlite";

export type DashboardStats = {
  empleados_activos: number;
  solicitudes_pendientes: number;
  contratos_por_vencer_30d: number;
  contratos_vencidos: number;
};

/** Real DB counts for the HR panel (shipped entry used by routes + tests). */
export function compute_dashboard_stats(db: Database): DashboardStats {
  const empleados_activos = (
    db
      .query(`SELECT COUNT(*) AS c FROM employees WHERE is_active = 1`)
      .get() as { c: number }
  ).c;

  const solicitudes_pendientes = (
    db
      .query(
        `SELECT COUNT(*) AS c FROM leave_requests WHERE status = 'pendiente'`,
      )
      .get() as { c: number }
  ).c;

  const contratos_por_vencer_30d = (
    db
      .query(
        `SELECT COUNT(*) AS c FROM contracts
         WHERE status = 'activo'
           AND end_date IS NOT NULL
           AND end_date >= date('now')
           AND end_date <= date('now', '+30 days')`,
      )
      .get() as { c: number }
  ).c;

  const contratos_vencidos = (
    db
      .query(
        `SELECT COUNT(*) AS c FROM contracts
         WHERE (status = 'vencido')
            OR (status = 'activo' AND end_date IS NOT NULL AND end_date < date('now'))`,
      )
      .get() as { c: number }
  ).c;

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
//   #endregion DASHBOARD STATS (pure queries)
// (o==================================================================o)
