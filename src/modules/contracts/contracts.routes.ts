import { define_crud, define_module } from "@opus-perpetuus/kirel-nox-kit";
import {
  prepare_contract_create,
  prepare_contract_update,
} from "./contracts.controller.ts";
import { contracts_pages } from "./contracts.pages.ts";
import { contracts_tables } from "./contracts.tables.ts";

const nullish_string = (v: unknown) =>
  v == null || v === "" ? null : String(v).trim() || null;

const routes = define_crud({
  resource: "contracts",
  table: "contracts",
  soft_delete: false,
  history: true,
  default_sort: "start_date:desc",
  id_prefix: "ctr",
  fields: {
    employee_id: { type: "string", required: true },
    type: { type: "string", required: true },
    start_date: { type: "string", required: true },
    end_date: { type: "string", normalize: nullish_string },
    salary: { type: "number" },
    currency: { type: "string" },
    schedule: { type: "string" },
    status: { type: "string" },
    notes: { type: "string", normalize: nullish_string },
  },
  hooks: {
    before_create: prepare_contract_create,
    before_update: prepare_contract_update,
  },
});

export const contracts_module = define_module({
  resource: "contracts",
  labels: {
    singular: "Contrato",
    plural: "Contratos",
    read: "Ver contratos",
    write: "Editar contratos",
  },
  routes,
  tables: contracts_tables,
  pages: contracts_pages,
  menu: [
    {
      id: "hr.contracts",
      label: "Contratos",
      order: 40,
      pageId: "hr.contracts",
      path: "contracts",
      permission: "kirlet.hr.contracts.read",
      icon: "document",
    },
  ],
});
