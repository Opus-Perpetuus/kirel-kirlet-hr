// (o==================================================================o)
//   #region MODULE REGISTRY
// (o-----------------------------------------------------------\/-----o)

import type { KirletIdentity, NoxPageDescriptor } from "@opus-perpetuus/kirel-nox-kit";
import { handle_employees } from "./employees/routes.ts";
import { build_employees_page } from "./employees/descriptors.ts";
import { handle_departments } from "./departments/routes.ts";
import { build_departments_page } from "./departments/descriptors.ts";
import { handle_positions } from "./positions/routes.ts";
import { build_positions_page } from "./positions/descriptors.ts";
import { handle_contracts } from "./contracts/routes.ts";
import { build_contracts_page } from "./contracts/descriptors.ts";
import { handle_leave } from "./leave/routes.ts";
import { build_leave_requests_page } from "./leave/descriptors.ts";
import { handle_documents } from "./documents/routes.ts";
import { build_documents_page } from "./documents/descriptors.ts";
import { handle_dashboard } from "./dashboard/routes.ts";
import { build_dashboard_page } from "./dashboard/descriptors.ts";

export type RouteHandler = (
  req: Request,
  path: string,
  url: URL,
  identity: KirletIdentity | null,
) => Promise<Response | null>;

const handlers: RouteHandler[] = [
  handle_employees,
  handle_departments,
  handle_positions,
  handle_contracts,
  handle_leave,
  handle_documents,
  handle_dashboard,
];

export async function dispatch_module(
  req: Request,
  path: string,
  url: URL,
  identity: KirletIdentity | null,
): Promise<Response | null> {
  for (const h of handlers) {
    const res = await h(req, path, url, identity);
    if (res) return res;
  }
  return null;
}

export type PageEntry = {
  id: string;
  path: string;
  permission?: string;
  build: () => NoxPageDescriptor;
};

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
];

export function get_page(id: string): NoxPageDescriptor | null {
  const entry = PAGE_ENTRIES.find((p) => p.id === id);
  return entry ? entry.build() : null;
}

export function list_page_index() {
  return PAGE_ENTRIES.map(({ id, path, permission }) => ({
    id,
    path,
    permission,
  }));
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion MODULE REGISTRY
// (o==================================================================o)
