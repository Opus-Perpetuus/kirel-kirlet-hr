import type { KirletPageDecl } from "@opus-perpetuus/kirel-nox-kit";

const API = "api://m/kirlet-hr";

export const dashboard_pages: KirletPageDecl[] = [
  {
    id: "hr.dashboard",
    path: "dashboard",
    permission: "kirlet.hr.dashboard.read",
    build: () => ({
      id: "hr.dashboard",
      owner: "kirlet-hr",
      title: "Panel de RR.HH.",
      realms: {
        internal: {
          path: "kirlet-hr/dashboard",
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
                  source: `${API}/dashboard/stats`,
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
    }),
  },
];
