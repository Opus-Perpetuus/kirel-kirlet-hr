// (o==================================================================o)
//   #region EMPLOYEES DESCRIPTORS
// (o-----------------------------------------------------------\/-----o)

import { build_feature_shell_page } from "@opus-perpetuus/kirel-nox-kit";
import type { NoxPageDescriptor } from "@opus-perpetuus/kirel-nox-kit";
import { get_api_base, get_technical_id } from "../../config.ts";

export function build_employees_page(): NoxPageDescriptor {
  const API_BASE = get_api_base();
  return build_feature_shell_page({
    id: "hr.employees",
    owner: get_technical_id(),
    title: "Empleados",
    props: {
      basePath: "employees",
      idKey: "id",
      nameKey: "name",
      view: {
        title: "Empleados",
        subtitle: "Plantilla y expediente de personal",
        pluralLabel: "empleados",
        singularLabel: "empleado",
        emptyTitle: "Sin empleados",
        emptyDescription: "Registra el primer empleado",
      },
      data: {
        list: `${API_BASE}/employees`,
        record: `${API_BASE}/employees/:id`,
        create: { method: "POST", action: `${API_BASE}/employees` },
        update: { method: "PATCH", action: `${API_BASE}/employees/:id` },
        delete: { method: "DELETE", action: `${API_BASE}/employees/:id` },
      },
      table: {
        columns: [
          { key: "name", label: "Nombre", sortable: true, priority: 1 },
          { key: "email", label: "Correo", sortable: true, priority: 2 },
          { key: "user_id", label: "Usuario", sortable: false, priority: 3 },
          { key: "hired_at", label: "Alta", sortable: true, priority: 3 },
        ],
        fillHeight: true,
        mobileCards: true,
        serverQuery: true,
      },
      form: {
        fields: [
          {
            name: "full_name",
            component: "input-text",
            label: "Nombre completo",
            required: true,
          },
          {
            name: "email",
            component: "input-text",
            label: "Correo",
            type: "email",
            required: true,
          },
          {
            name: "department_id",
            component: "input-menu",
            label: "Departamento",
            optionsSource: `${API_BASE}/departments?as=options`,
          },
          {
            name: "position_id",
            component: "input-menu",
            label: "Puesto",
            optionsSource: `${API_BASE}/positions?as=options`,
          },
          {
            name: "manager_id",
            component: "input-menu",
            label: "Jefe directo",
            optionsSource: `${API_BASE}/employees?as=options`,
          },
          {
            name: "user_id",
            component: "input-menu",
            label: "Usuario de plataforma",
            // Platform (NOX) staff/users list — value = user id, label = name/email.
            optionsSource: "api://users",
          },
          {
            name: "hired_at",
            component: "input-date",
            label: "Fecha de alta",
          },
          {
            name: "phone",
            component: "input-text",
            label: "Teléfono",
            type: "tel",
          },
          {
            name: "rfc",
            component: "input-text",
            label: "RFC",
          },
          {
            name: "curp",
            component: "input-text",
            label: "CURP",
          },
          {
            name: "nss",
            component: "input-text",
            label: "NSS",
          },
        ],
      },
      permission: "kirlet.hr.employees",
    },
  });
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion EMPLOYEES DESCRIPTORS
// (o==================================================================o)
