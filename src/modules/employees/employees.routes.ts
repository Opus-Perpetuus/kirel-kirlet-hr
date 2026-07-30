import {
  define_crud,
  define_module,
  define_routes,
} from "@opus-perpetuus/kirel-nox-kit";
import {
  get_employee_team,
  prepare_employee_create,
  prepare_employee_update,
} from "./employees.controller.ts";
import { employees_pages } from "./employees.pages.ts";
import { employees_tables } from "./employees.tables.ts";

const nullish_string = (v: unknown) =>
  v == null || v === "" ? null : String(v).trim() || null;

const crud = define_crud({
  resource: "employees",
  table: "employees",
  soft_delete: true,
  history: true,
  default_sort: "name:asc",
  id_prefix: "emp",
  fields: {
    full_name: {
      type: "string",
      required: true,
      search: true,
      normalize: (v) => String(v ?? "").trim(),
    },
    name: {
      type: "string",
      search: true,
      normalize: (v) => String(v ?? "").trim(),
    },
    email: {
      type: "string",
      required: true,
      search: true,
      normalize: (v) =>
        String(v ?? "")
          .trim()
          .toLowerCase(),
      validate: (v) =>
        typeof v === "string" && v.includes("@")
          ? null
          : "correo electrónico válido es requerido",
    },
    department_id: { type: "string", normalize: nullish_string },
    position_id: { type: "string", normalize: nullish_string },
    manager_id: { type: "string", normalize: nullish_string },
    user_id: { type: "string", normalize: nullish_string },
    hired_at: { type: "string", normalize: nullish_string },
    phone: { type: "string", search: true, normalize: nullish_string },
    rfc: { type: "string", search: true, normalize: nullish_string },
    curp: { type: "string", normalize: nullish_string },
    nss: { type: "string", normalize: nullish_string },
    active: { type: "boolean" },
  },
  options_map: { value: "id", label: "full_name" },
  hooks: {
    before_create: prepare_employee_create,
    before_update: prepare_employee_update,
  },
});

const extra = define_routes({
  "GET /employees/:id/team": get_employee_team,
});

export const employees_module = define_module({
  resource: "employees",
  labels: {
    singular: "Empleado",
    plural: "Empleados",
    read: "Ver empleados",
    write: "Editar empleados",
  },
  routes: [...extra, ...crud],
  tables: employees_tables,
  pages: employees_pages,
  menu: [
    {
      id: "hr.employees",
      label: "Empleados",
      order: 10,
      pageId: "hr.employees",
      path: "employees",
      permission: "kirlet.hr.employees.read",
      icon: "users",
    },
  ],
});
