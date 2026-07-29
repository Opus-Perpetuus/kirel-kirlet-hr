// (o==================================================================o)
//   #region MENU
// (o-----------------------------------------------------------\/-----o)

export type MenuItem = {
  id: string;
  label: string;
  order: number;
  realm: "internal" | "public";
  pageId: string;
  path?: string;
  permission?: string;
  /** Kirita registry icon id for NOX sidebar. */
  icon?: string;
};

/** Menú es-MX con permisos e íconos por módulo. */
export function build_hr_menu(): MenuItem[] {
  return [
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
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion MENU
// (o==================================================================o)
