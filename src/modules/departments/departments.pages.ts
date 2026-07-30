import {
  build_feature_shell_page,
  type KirletPageDecl,
} from "@opus-perpetuus/kirel-nox-kit";

const API = "api://m/kirlet-hr";

export const departments_pages: KirletPageDecl[] = [
  {
    id: "hr.departments",
    path: "departments",
    permission: "kirlet.hr.departments.read",
    build: () =>
      build_feature_shell_page({
        id: "hr.departments",
        owner: "kirlet-hr",
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
            list: `${API}/departments`,
            record: `${API}/departments/:id`,
            create: { method: "POST", action: `${API}/departments` },
            update: { method: "PATCH", action: `${API}/departments/:id` },
            delete: { method: "DELETE", action: `${API}/departments/:id` },
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
      }),
  },
];
