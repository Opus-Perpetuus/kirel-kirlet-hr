import { define_module, define_routes } from "@opus-perpetuus/kirel-nox-kit";
import { dashboard_pages } from "./dashboard.pages.ts";
import { dashboard_stats_handler } from "./dashboard.service.ts";

const routes = define_routes({
  "GET /dashboard": dashboard_stats_handler,
  "GET /dashboard/stats": dashboard_stats_handler,
});

export const dashboard_module = define_module({
  resource: "dashboard",
  labels: {
    singular: "Panel",
    plural: "Panel",
    read: "Ver panel",
    write: "Administrar panel",
  },
  routes,
  pages: dashboard_pages,
  menu: [
    {
      id: "hr.dashboard",
      label: "Panel",
      order: 5,
      pageId: "hr.dashboard",
      path: "dashboard",
      permission: "kirlet.hr.dashboard.read",
      icon: "dashboard",
    },
  ],
});
