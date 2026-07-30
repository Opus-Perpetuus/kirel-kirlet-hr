import {
  build_feature_shell_page,
  type KirletPageDecl,
} from "@opus-perpetuus/kirel-nox-kit";

const API = "api://m/kirlet-hr";

export const positions_pages: KirletPageDecl[] = [
  {
    id: "hr.positions",
    path: "positions",
    permission: "kirlet.hr.positions.read",
    build: () =>
      build_feature_shell_page({
        id: "hr.positions",
        owner: "kirlet-hr",
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
            list: `${API}/positions`,
            record: `${API}/positions/:id`,
            create: { method: "POST", action: `${API}/positions` },
            update: { method: "PATCH", action: `${API}/positions/:id` },
            delete: { method: "DELETE", action: `${API}/positions/:id` },
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
                optionsSource: `${API}/departments?as=options`,
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
      }),
  },
];
