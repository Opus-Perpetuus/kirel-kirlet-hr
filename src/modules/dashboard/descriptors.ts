// (o==================================================================o)
//   #region DASHBOARD DESCRIPTORS
// (o-----------------------------------------------------------\/-----o)

import type { NoxPageDescriptor } from "@opus-perpetuus/kirel-nox-kit";
import { get_api_base, get_technical_id } from "../../config.ts";

/** Classic dashboard: nox.stats + nox.table (not feature-shell). */
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
        subtitle: "Resumen operativo",
      },
      children: [
        {
          component: "nox.stack",
          children: [
            {
              component: "nox.stats",
              props: {
                source: `${API_BASE}/dashboard/stats`,
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
                ],
              },
            },
            {
              component: "nox.table",
              props: {
                fillHeight: false,
                columns: [
                  { key: "metric", label: "Métrica" },
                  { key: "value", label: "Valor" },
                ],
                source: `${API_BASE}/dashboard/stats`,
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
