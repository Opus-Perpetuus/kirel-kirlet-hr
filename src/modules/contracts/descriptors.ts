// (o==================================================================o)
//   #region CONTRACTS DESCRIPTORS
// (o-----------------------------------------------------------\/-----o)

import { build_feature_shell_page } from "@opus-perpetuus/kirel-nox-kit";
import type { NoxPageDescriptor } from "@opus-perpetuus/kirel-nox-kit";
import { get_api_base, get_technical_id } from "../../config.ts";

export function build_contracts_page(): NoxPageDescriptor {
  const API_BASE = get_api_base();
  return build_feature_shell_page({
    id: "hr.contracts",
    owner: get_technical_id(),
    title: "Contratos",
    props: {
      basePath: "contracts",
      idKey: "id",
      nameKey: "type",
      view: {
        title: "Contratos",
        subtitle: "Relaciones laborales",
        pluralLabel: "contratos",
        singularLabel: "contrato",
        emptyTitle: "Sin contratos",
        emptyDescription: "Registra el primer contrato",
      },
      data: {
        list: `${API_BASE}/contracts`,
        record: `${API_BASE}/contracts/:id`,
        create: { method: "POST", action: `${API_BASE}/contracts` },
        update: { method: "PATCH", action: `${API_BASE}/contracts/:id` },
        delete: { method: "DELETE", action: `${API_BASE}/contracts/:id` },
      },
      table: {
        columns: [
          { key: "type", label: "Tipo", sortable: true, priority: 1 },
          {
            key: "start_date",
            label: "Inicio",
            sortable: true,
            priority: 2,
          },
          {
            key: "status",
            label: "Estado",
            cell: "badge",
            priority: 2,
          },
          {
            key: "salary",
            label: "Sueldo",
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
            optionsSource: `${API_BASE}/employees?as=options`,
          },
          {
            name: "type",
            component: "input-menu",
            label: "Tipo",
            required: true,
            options: [
              { value: "indeterminado", label: "Indeterminado" },
              { value: "determinado", label: "Determinado" },
              { value: "obra", label: "Obra" },
              { value: "capacitacion", label: "Capacitación" },
              { value: "temporada", label: "Temporada" },
            ],
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
          },
          {
            name: "salary",
            component: "input-number",
            label: "Sueldo",
            min: 0,
          },
          {
            name: "schedule",
            component: "input-menu",
            label: "Jornada",
            options: [
              { value: "completa", label: "Completa" },
              { value: "parcial", label: "Parcial" },
            ],
          },
          {
            name: "status",
            component: "input-menu",
            label: "Estado",
            options: [
              { value: "activo", label: "Activo" },
              { value: "vencido", label: "Vencido" },
              { value: "terminado", label: "Terminado" },
            ],
          },
          {
            name: "notes",
            component: "input-textarea",
            label: "Notas",
          },
        ],
      },
      permission: "kirlet.hr.contracts",
    },
  });
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion CONTRACTS DESCRIPTORS
// (o==================================================================o)
