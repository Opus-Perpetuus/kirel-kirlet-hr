// (o==================================================================o)
//   #region DASHBOARD ROUTES
// (o-----------------------------------------------------------\/-----o)

import type { KirletIdentity } from "@opus-perpetuus/kirel-nox-kit";
import { get_db } from "../../db.ts";
import { json, method_not_allowed } from "../../http.ts";
import { require_access } from "../../auth.ts";

export async function handle_dashboard(
  req: Request,
  path: string,
  _url: URL,
  identity: KirletIdentity | null,
): Promise<Response | null> {
  if (path === "/dashboard/stats" || path === "/dashboard") {
    if (req.method !== "GET") return method_not_allowed(["GET"]);
    const denied = require_access(identity, "dashboard", "read");
    if (denied) return denied;
    return stats();
  }
  return null;
}

function stats(): Response {
  const db = get_db();

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

  // Also count already-vencido actives for transparency
  const contratos_vencidos = (
    db
      .query(
        `SELECT COUNT(*) AS c FROM contracts
         WHERE (status = 'vencido')
            OR (status = 'activo' AND end_date IS NOT NULL AND end_date < date('now'))`,
      )
      .get() as { c: number }
  ).c;

  return json({
    data: {
      empleados_activos,
      solicitudes_pendientes,
      contratos_por_vencer_30d,
      contratos_vencidos,
    },
  });
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DASHBOARD ROUTES
// (o==================================================================o)
