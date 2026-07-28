// (o==================================================================o)
//   #region POSITIONS DESCRIPTORS
// (o-----------------------------------------------------------\/-----o)

import { build_feature_shell_page } from "@opus-perpetuus/kirel-nox-kit";
import type { NoxPageDescriptor } from "@opus-perpetuus/kirel-nox-kit";
import { get_api_base, get_technical_id } from "../../config.ts";

export function build_positions_page(): NoxPageDescriptor {
  const API_BASE = get_api_base();
  return build_feature_shell_page({
    id: "hr.positions",
    owner: get_technical_id(),
    title: "Puestos",
    props: {
      basePath: "positions",
      idKey: "id",
      nameKey: "name",
      view: {
        title: "Puestos",
        subtitle: "Catálogo de puestos",
        pluralLabel: "puestos",
        singularLabel: "puesto",
        emptyTitle: "Sin puestos",
        emptyDescription: "Crea el primer puesto",
      },
      data: {
        list: `${API_BASE}/positions`,
        record: `${API_BASE}/positions/:id`,
        create: { method: "POST", action: `${API_BASE}/positions` },
        update: { method: "PATCH", action: `${API_BASE}/positions/:id` },
        delete: { method: "DELETE", action: `${API_BASE}/positions/:id` },
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
            name: "department_id",
            component: "input-menu",
            label: "Departamento",
            optionsSource: `${API_BASE}/departments?as=options`,
          },
          {
            name: "description",
            component: "input-textarea",
            label: "Descripción",
          },
        ],
      },
      permission: "kirlet.hr.positions",
    },
  });
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion POSITIONS DESCRIPTORS
// (o==================================================================o)
