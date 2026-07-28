// (o==================================================================o)
//   #region DEPARTMENTS DESCRIPTORS
// (o-----------------------------------------------------------\/-----o)

import { build_feature_shell_page } from "@opus-perpetuus/kirel-nox-kit";
import type { NoxPageDescriptor } from "@opus-perpetuus/kirel-nox-kit";
import { get_api_base, get_technical_id } from "../../config.ts";

export function build_departments_page(): NoxPageDescriptor {
  const API_BASE = get_api_base();
  return build_feature_shell_page({
    id: "hr.departments",
    owner: get_technical_id(),
    title: "Departamentos",
    props: {
      basePath: "departments",
      idKey: "id",
      nameKey: "name",
      view: {
        title: "Departamentos",
        subtitle: "Áreas organizacionales",
        pluralLabel: "departamentos",
        singularLabel: "departamento",
        emptyTitle: "Sin departamentos",
        emptyDescription: "Crea el primer departamento",
      },
      data: {
        list: `${API_BASE}/departments`,
        record: `${API_BASE}/departments/:id`,
        create: { method: "POST", action: `${API_BASE}/departments` },
        update: { method: "PATCH", action: `${API_BASE}/departments/:id` },
        delete: { method: "DELETE", action: `${API_BASE}/departments/:id` },
      },
      table: {
        columns: [
          { key: "name", label: "Nombre", sortable: true, priority: 1 },
          {
            key: "description",
            label: "Descripción",
            sortable: false,
            priority: 2,
          },
        ],
        fillHeight: true,
        mobileCards: true,
        serverQuery: true,
      },
      form: {
        fields: [
          {
            name: "name",
            component: "input-text",
            label: "Nombre",
            required: true,
          },
          {
            name: "description",
            component: "input-textarea",
            label: "Descripción",
          },
        ],
      },
      permission: "kirlet.hr.departments",
    },
  });
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DEPARTMENTS DESCRIPTORS
// (o==================================================================o)
