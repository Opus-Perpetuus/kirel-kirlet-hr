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
};

/** Menú es-MX con permisos por módulo. */
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
    },
    {
      id: "hr.employees",
      label: "Empleados",
      order: 10,
      realm: "internal",
      pageId: "hr.employees",
      path: "employees",
      permission: "kirlet.hr.employees.read",
    },
    {
      id: "hr.departments",
      label: "Departamentos",
      order: 20,
      realm: "internal",
      pageId: "hr.departments",
      path: "departments",
      permission: "kirlet.hr.departments.read",
    },
    {
      id: "hr.positions",
      label: "Puestos",
      order: 30,
      realm: "internal",
      pageId: "hr.positions",
      path: "positions",
      permission: "kirlet.hr.positions.read",
    },
    {
      id: "hr.contracts",
      label: "Contratos",
      order: 40,
      realm: "internal",
      pageId: "hr.contracts",
      path: "contracts",
      permission: "kirlet.hr.contracts.read",
    },
    {
      id: "hr.leave-requests",
      label: "Ausencias",
      order: 50,
      realm: "internal",
      pageId: "hr.leave-requests",
      path: "leave-requests",
      permission: "kirlet.hr.leave.read",
    },
    {
      id: "hr.documents",
      label: "Documentos",
      order: 60,
      realm: "internal",
      pageId: "hr.documents",
      path: "documents",
      permission: "kirlet.hr.documents.read",
    },
  ];
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion MENU
// (o==================================================================o)
