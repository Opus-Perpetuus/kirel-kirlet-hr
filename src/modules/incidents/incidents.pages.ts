import {
  build_feature_shell_page,
  type KirletPageDecl,
} from "@opus-perpetuus/kirel-nox-kit";

const API = "api://m/kirlet-hr";

export const incidents_pages: KirletPageDecl[] = [
  {
    id: "hr.incidents",
    path: "incidents",
    permission: "kirlet.hr.incidents.read",
    build: () =>
      build_feature_shell_page({
        id: "hr.incidents",
        owner: "kirlet-hr",
        title: "Incidencias",
        props: {
          basePath: "incidents",
          idKey: "id",
          nameKey: "title",
          view: {
            title: "Incidencias",
            subtitle: "Registro de accidentes, quejas, disciplina y seguridad",
            pluralLabel: "incidencias",
            singularLabel: "incidencia",
            emptyTitle: "Sin incidencias",
            emptyDescription: "Registra la primera incidencia del personal",
          },
          data: {
            list: `${API}/incidents`,
            record: `${API}/incidents/:id`,
            create: { method: "POST", action: `${API}/incidents` },
            update: { method: "PATCH", action: `${API}/incidents/:id` },
            delete: { method: "DELETE", action: `${API}/incidents/:id` },
          },
          table: {
            columns: [
              { key: "folio", label: "Folio", sortable: true, priority: 1 },
              { key: "title", label: "Título", sortable: true, priority: 1 },
              {
                key: "type",
                label: "Tipo",
                cell: "badge",
                sortable: true,
                priority: 2,
              },
              {
                key: "severity",
                label: "Severidad",
                cell: "badge",
                sortable: true,
                priority: 2,
              },
              {
                key: "status",
                label: "Estado",
                cell: "badge",
                sortable: true,
                priority: 1,
              },
              {
                key: "occurred_at",
                label: "Ocurrida",
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
                name: "title",
                component: "input-text",
                label: "Título",
                required: true,
              },
              {
                name: "type",
                component: "input-menu",
                label: "Tipo",
                required: true,
                options: [
                  { value: "accidente", label: "Accidente" },
                  { value: "enfermedad", label: "Enfermedad" },
                  { value: "disciplina", label: "Disciplina" },
                  { value: "queja", label: "Queja" },
                  { value: "mejora", label: "Mejora" },
                  { value: "seguridad", label: "Seguridad" },
                  { value: "otro", label: "Otro" },
                ],
              },
              {
                name: "severity",
                component: "input-menu",
                label: "Severidad",
                required: true,
                options: [
                  { value: "baja", label: "Baja" },
                  { value: "media", label: "Media" },
                  { value: "alta", label: "Alta" },
                  { value: "critica", label: "Crítica" },
                ],
              },
              {
                name: "employee_id",
                component: "input-menu",
                label: "Empleado involucrado",
                optionsSource: `${API}/employees?as=options`,
              },
              {
                name: "occurred_at",
                component: "input-date",
                label: "Fecha de ocurrencia",
              },
              {
                name: "location",
                component: "input-text",
                label: "Lugar",
              },
              {
                name: "reported_by",
                component: "input-text",
                label: "Reportado por",
              },
              {
                name: "assigned_to",
                component: "input-text",
                label: "Asignado a",
              },
              {
                name: "description",
                component: "input-textarea",
                label: "Descripción",
              },
              {
                name: "resolution_note",
                component: "input-textarea",
                label: "Nota de resolución",
              },
            ],
          },
          headerActions: {
            detail: [
              {
                id: "review",
                label: "En revisión",
                variant: "secondary",
                invoke: {
                  method: "POST",
                  action: `${API}/incidents/:id/review`,
                },
                refresh: "record",
              },
              {
                id: "start",
                label: "En proceso",
                variant: "secondary",
                invoke: {
                  method: "POST",
                  action: `${API}/incidents/:id/start`,
                },
                refresh: "record",
              },
              {
                id: "resolve",
                label: "Resolver",
                variant: "primary",
                confirm: "¿Marcar la incidencia como resuelta?",
                invoke: {
                  method: "POST",
                  action: `${API}/incidents/:id/resolve`,
                },
                refresh: "record",
              },
              {
                id: "close",
                label: "Cerrar",
                variant: "primary",
                confirm: "¿Cerrar la incidencia?",
                invoke: {
                  method: "POST",
                  action: `${API}/incidents/:id/close`,
                },
                refresh: "record",
              },
              {
                id: "cancel",
                label: "Cancelar",
                variant: "danger",
                confirm: "¿Cancelar esta incidencia?",
                invoke: {
                  method: "POST",
                  action: `${API}/incidents/:id/cancel`,
                },
                refresh: "record",
              },
            ],
          },
        },
      }),
  },
];
