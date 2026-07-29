// (o==================================================================o)
//   #region MENU
// (o-----------------------------------------------------------\/-----o)

export type MenuItem = {
  id: string;
  label: string;
  order: number;
  realm: "internal" | "public";
  /** Leaf target. Omit on group parents that only carry `children`. */
  pageId?: string;
  path?: string;
  permission?: string;
  /** Kirita registry icon id for NOX sidebar. */
  icon?: string;
  /** Nested items — each top-level root becomes one sidebar group in NOX. */
  children?: MenuItem[];
};

/** Depth-first leaf nodes (items with a pageId / no children). */
export function flatten_menu_leaves(items: readonly MenuItem[]): MenuItem[] {
  const out: MenuItem[] = [];
  for (const item of items) {
    if (item.children?.length) {
      out.push(...flatten_menu_leaves(item.children));
    } else {
      out.push(item);
    }
  }
  return out;
}

/**
 * Menú es-MX con permisos e íconos por módulo.
 * Un solo grupo raíz: NOX mapea cada raíz a una sección del sidebar;
 * una lista plana produciría un encabezado por página.
 */
export function build_hr_menu(): MenuItem[] {
  const leaves: MenuItem[] = [
    {
      id: "hr.dashboard",
      label: "Panel",
      order: 5,
      realm: "internal",
      pageId: "hr.dashboard",
      path: "dashboard",
      permission: "kirlet.hr.dashboard.read",
      icon: "dashboard",
    },
    {
      id: "hr.employees",
      label: "Empleados",
      order: 10,
      realm: "internal",
      pageId: "hr.employees",
      path: "employees",
      permission: "kirlet.hr.employees.read",
      icon: "users",
    },
    {
      id: "hr.departments",
      label: "Departamentos",
      order: 20,
      realm: "internal",
      pageId: "hr.departments",
      path: "departments",
      permission: "kirlet.hr.departments.read",
      icon: "building",
    },
    {
      id: "hr.positions",
      label: "Puestos",
      order: 30,
      realm: "internal",
      pageId: "hr.positions",
      path: "positions",
      permission: "kirlet.hr.positions.read",
      icon: "briefcase",
    },
    {
      id: "hr.contracts",
      label: "Contratos",
      order: 40,
      realm: "internal",
      pageId: "hr.contracts",
      path: "contracts",
      permission: "kirlet.hr.contracts.read",
      icon: "document",
    },
    {
      id: "hr.leave-requests",
      label: "Ausencias",
      order: 50,
      realm: "internal",
      pageId: "hr.leave-requests",
      path: "leave-requests",
      permission: "kirlet.hr.leave.read",
      icon: "calendar",
    },
    {
      id: "hr.documents",
      label: "Documentos",
      order: 60,
      realm: "internal",
      pageId: "hr.documents",
      path: "documents",
      permission: "kirlet.hr.documents.read",
      icon: "attachment",
    },
    {
      id: "hr.incidents",
      label: "Incidencias",
      order: 70,
      realm: "internal",
      pageId: "hr.incidents",
      path: "incidents",
      permission: "kirlet.hr.incidents.read",
      icon: "warning",
    },
  ];

  return [
    {
      id: "hr.nav",
      label: "RR.HH.",
      order: 0,
      realm: "internal",
      children: leaves,
    },
  ];
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion MENU
// (o==================================================================o)
