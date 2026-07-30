import {
  build_feature_shell_page,
  type KirletPageDecl,
} from "@opus-perpetuus/kirel-nox-kit";

const API = "api://m/kirlet-hr";

export const leave_pages: KirletPageDecl[] = [
  {
    id: "hr.leave-requests",
    path: "leave-requests",
    permission: "kirlet.hr.leave.read",
    build: () =>
      build_feature_shell_page({
        id: "hr.leave-requests",
        owner: "kirlet-hr",
        title: "Ausencias",
        props: {
          basePath: "leave-requests",
          idKey: "id",
          nameKey: "status",
          view: {
            title: "Ausencias",
            subtitle: "Solicitudes de vacaciones y permisos",
            pluralLabel: "solicitudes",
            singularLabel: "solicitud",
            emptyTitle: "Sin solicitudes",
            emptyDescription: "Crea la primera solicitud de ausencia",
          },
          data: {
            list: `${API}/leave-requests`,
            record: `${API}/leave-requests/:id`,
            create: { method: "POST", action: `${API}/leave-requests` },
            update: { method: "PATCH", action: `${API}/leave-requests/:id` },
            delete: { method: "DELETE", action: `${API}/leave-requests/:id` },
          },
          table: {
            columns: [
              {
                key: "start_date",
                label: "Inicio",
                sortable: true,
                priority: 1,
              },
              {
                key: "end_date",
                label: "Fin",
                sortable: true,
                priority: 2,
              },
              {
                key: "days",
                label: "Días",
                sortable: true,
                priority: 2,
              },
              {
                key: "status",
                label: "Estado",
                cell: "badge",
                priority: 1,
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
                name: "leave_type_id",
                component: "input-menu",
                label: "Tipo de ausencia",
                required: true,
                optionsSource: `${API}/leave-types?as=options`,
              },
              {
                name: "start_date",
                component: "input-date",
                label: "Fecha de inicio",
                required: true,
              },
              {
                name: "end_date",
                component: "input-date",
                label: "Fecha de fin",
                required: true,
              },
              {
                name: "days",
                component: "input-number",
                label: "Días",
                min: 0.5,
                step: 0.5,
              },
              {
                name: "reason",
                component: "input-textarea",
                label: "Motivo",
              },
            ],
          },
          headerActions: {
            detail: [
              {
                id: "approve",
                label: "Aprobar",
                variant: "primary",
                confirm: "¿Aprobar esta solicitud?",
                invoke: {
                  method: "POST",
                  action: `${API}/leave-requests/:id/approve`,
                },
                refresh: "record",
              },
              {
                id: "reject",
                label: "Rechazar",
                variant: "danger",
                confirm: "¿Rechazar esta solicitud?",
                invoke: {
                  method: "POST",
                  action: `${API}/leave-requests/:id/reject`,
                },
                refresh: "record",
              },
            ],
          },
          permission: "kirlet.hr.leave",
        },
      }),
  },
];
