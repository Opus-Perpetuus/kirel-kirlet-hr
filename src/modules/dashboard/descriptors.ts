// (o==================================================================o)
//   #region DASHBOARD DESCRIPTORS
// (o-----------------------------------------------------------\/-----o)

import type { NoxPageDescriptor } from "@opus-perpetuus/kirel-nox-kit";
import { get_api_base, get_technical_id } from "../../config.ts";

/** Classic dashboard: nox.stats with live source + poll; summary table. */
export function build_dashboard_page(): NoxPageDescriptor {
  const API_BASE = get_api_base();
  const technical_id = get_technical_id();
  return {
    id: "hr.dashboard",
    owner: technical_id,
    title: "Panel de RR.HH.",
    realms: {
      internal: {
        path: `${technical_id}/dashboard`,
        permission: "kirlet.hr.dashboard.read",
      },
    },
    page: {
      component: "nox.page",
      props: {
        title: "Panel de RR.HH.",
        subtitle: "Resumen operativo (actualización automática)",
      },
      children: [
        {
          component: "nox.stack",
          children: [
            {
              component: "nox.stats",
              props: {
                source: `${API_BASE}/dashboard/stats`,
                refreshIntervalMs: 10_000,
                items: [
                  {
                    key: "empleados_activos",
                    label: "Empleados activos",
                  },
                  {
                    key: "solicitudes_pendientes",
                    label: "Solicitudes pendientes",
                  },
                  {
                    key: "contratos_por_vencer_30d",
                    label: "Contratos por vencer (30 d)",
                  },
                  {
                    key: "contratos_vencidos",
                    label: "Contratos vencidos",
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  };
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DASHBOARD DESCRIPTORS
// (o==================================================================o)
