// (o==================================================================o)
//   #region MODULE REGISTRY (page index + thin facade over KirletApp)
// (o-----------------------------------------------------------\/-----o)

import type { NoxPageDescriptor } from "@opus-perpetuus/kirel-nox-kit";
import { get_hr_app } from "../app/hr-app.ts";
import { build_dashboard_page } from "./dashboard/descriptors.ts";
import { build_employees_page } from "./employees/descriptors.ts";
import { build_departments_page } from "./departments/descriptors.ts";
import { build_positions_page } from "./positions/descriptors.ts";
import { build_contracts_page } from "./contracts/descriptors.ts";
import { build_leave_requests_page } from "./leave/descriptors.ts";
import { build_documents_page } from "./documents/descriptors.ts";
import { build_incidents_page } from "./incidents/descriptors.ts";

export type PageEntry = {
  id: string;
  path: string;
  permission?: string;
  build: () => NoxPageDescriptor;
};

/** Static page catalog (descriptors only; routes live on KirletModule classes). */
export const PAGE_ENTRIES: PageEntry[] = [
  {
    id: "hr.dashboard",
    path: "dashboard",
    permission: "kirlet.hr.dashboard.read",
    build: build_dashboard_page,
  },
  {
    id: "hr.employees",
    path: "employees",
    permission: "kirlet.hr.employees.read",
    build: build_employees_page,
  },
  {
    id: "hr.departments",
    path: "departments",
    permission: "kirlet.hr.departments.read",
    build: build_departments_page,
  },
  {
    id: "hr.positions",
    path: "positions",
    permission: "kirlet.hr.positions.read",
    build: build_positions_page,
  },
  {
    id: "hr.contracts",
    path: "contracts",
    permission: "kirlet.hr.contracts.read",
    build: build_contracts_page,
  },
  {
    id: "hr.leave-requests",
    path: "leave-requests",
    permission: "kirlet.hr.leave.read",
    build: build_leave_requests_page,
  },
  {
    id: "hr.documents",
    path: "documents",
    permission: "kirlet.hr.documents.read",
    build: build_documents_page,
  },
  {
    id: "hr.incidents",
    path: "incidents",
    permission: "kirlet.hr.incidents.read",
    build: build_incidents_page,
  },
];

export function get_page(id: string): NoxPageDescriptor | null {
  try {
    return get_hr_app().get_page(id);
  } catch {
    const entry = PAGE_ENTRIES.find((p) => p.id === id);
    return entry ? entry.build() : null;
  }
}

export function list_page_index() {
  try {
    return get_hr_app()
      .list_pages()
      .map(({ id, path, permission }) => ({ id, path, permission }));
  } catch {
    return PAGE_ENTRIES.map(({ id, path, permission }) => ({
      id,
      path,
      permission,
    }));
  }
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion MODULE REGISTRY
// (o==================================================================o)
