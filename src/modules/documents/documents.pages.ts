import {
  build_feature_shell_page,
  type KirletPageDecl,
} from "@opus-perpetuus/kirel-nox-kit";

const API = "api://m/kirlet-hr";

export const documents_pages: KirletPageDecl[] = [
  {
    id: "hr.documents",
    path: "documents",
    permission: "kirlet.hr.documents.read",
    build: () =>
      build_feature_shell_page({
        id: "hr.documents",
        owner: "kirlet-hr",
        title: "Documentos",
        props: {
          basePath: "documents",
          idKey: "id",
          nameKey: "title",
          view: {
            title: "Documentos",
            subtitle: "Expediente digital del personal",
            pluralLabel: "documentos",
            singularLabel: "documento",
            emptyTitle: "Sin documentos",
            emptyDescription: "Sube el primer documento",
          },
          data: {
            list: `${API}/documents`,
            record: `${API}/documents/:id`,
            create: { method: "POST", action: `${API}/documents` },
            delete: { method: "DELETE", action: `${API}/documents/:id` },
          },
          table: {
            columns: [
              { key: "title", label: "Título", sortable: true, priority: 1 },
              {
                key: "doc_type",
                label: "Tipo",
                sortable: true,
                priority: 2,
              },
              {
                key: "file_name",
                label: "Archivo",
                priority: 2,
              },
              {
                key: "created_at",
                label: "Subido",
                sortable: true,
                priority: 3,
              },
            ],
            fillHeight: true,
            mobileCards: true,
            serverQuery: true,
          },
          form: {
            fields: [
              {
                name: "employee_id",
                component: "input-menu",
                label: "Empleado",
                required: true,
                optionsSource: `${API}/employees?as=options`,
              },
              {
                name: "title",
                component: "input-text",
                label: "Título",
                required: true,
              },
              {
                name: "doc_type",
                component: "input-menu",
                label: "Tipo de documento",
                options: [
                  { value: "identificacion", label: "Identificación" },
                  { value: "contrato", label: "Contrato" },
                  { value: "constancia", label: "Constancia" },
                  { value: "medico", label: "Médico" },
                  { value: "otro", label: "Otro" },
                ],
              },
              {
                name: "file",
                component: "input-file",
                label: "Archivo",
                required: true,
                accept: ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx",
              },
            ],
          },
          permission: "kirlet.hr.documents",
        },
      }),
  },
];
