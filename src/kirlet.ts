import { define_kirlet } from "@opus-perpetuus/kirel-nox-kit";
import { contracts_module } from "./modules/contracts/contracts.routes.ts";
import { dashboard_module } from "./modules/dashboard/dashboard.routes.ts";
import { departments_module } from "./modules/departments/departments.routes.ts";
import { documents_module } from "./modules/documents/documents.routes.ts";
import { employees_module } from "./modules/employees/employees.routes.ts";
import { incidents_module } from "./modules/incidents/incidents.routes.ts";
import { leave_module } from "./modules/leave/leave.routes.ts";
import { positions_module } from "./modules/positions/positions.routes.ts";
import { seed_demo } from "./seed.ts";

export const KIRLET = define_kirlet({
  id: "KIRLET-hr",
  name: "Recursos Humanos",
  version: "0.7.0",
  image: "kyostenas/kirlet-hr:0.7.0",
  compat: { nox: ">=0.5.0", kit: "^0.5.0" },
  storage_files: true,
  schema_version: 2,
  icon: {
    label: "RR.HH.",
    paths: [
      {
        d: "M7 2h4v4h-4zM7 7h4v4h-4zM17 7h4v4h-4zM12 12h4v4h-4zM17 12h4v4h-4zM12 17h4v4h-4zM17 17h4v4h-4z",
        paint: "fill",
      },
      {
        d: "M13 8h2v2h-2z",
        paint: "fill",
      },
    ],
  },
  menu_root: {
    id: "hr.nav",
    label: "RR.HH.",
    order: 0,
  },
  // Table order: FK parents before children (NOX DDL). Menu uses item.order.
  modules: [
    departments_module,
    positions_module,
    employees_module,
    contracts_module,
    leave_module,
    documents_module,
    incidents_module,
    dashboard_module,
  ],
  seed: seed_demo,
});
