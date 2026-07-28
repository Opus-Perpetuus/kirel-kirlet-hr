// (o==================================================================o)
//   #region DOCUMENTS DESCRIPTORS
// (o-----------------------------------------------------------\/-----o)

import { build_feature_shell_page } from "@opus-perpetuus/kirel-nox-kit";
import type { NoxPageDescriptor } from "@opus-perpetuus/kirel-nox-kit";
import { get_api_base, get_technical_id } from "../../config.ts";

export function build_documents_page(): NoxPageDescriptor {
  const API_BASE = get_api_base();
  return build_feature_shell_page({
    id: "hr.documents",
    owner: get_technical_id(),
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
        list: `${API_BASE}/documents`,
        record: `${API_BASE}/documents/:id`,
        create: { method: "POST", action: `${API_BASE}/documents` },
        delete: { method: "DELETE", action: `${API_BASE}/documents/:id` },
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
            optionsSource: `${API_BASE}/employees?as=options`,
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
  });
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DOCUMENTS DESCRIPTORS
// (o==================================================================o)
