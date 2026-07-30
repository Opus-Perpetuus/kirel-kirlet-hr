import {
  define_crud,
  define_module,
  define_routes,
} from "@opus-perpetuus/kirel-nox-kit";
import {
  prepare_incident_create,
  prepare_incident_update,
  transition_incident,
} from "./incidents.controller.ts";
import { incidents_pages } from "./incidents.pages.ts";
import { incidents_tables } from "./incidents.tables.ts";

const nullish_string = (v: unknown) =>
  v == null || v === "" ? null : String(v).trim() || null;

const crud = define_crud({
  resource: "incidents",
  table: "incidents",
  soft_delete: true,
  history: true,
  default_sort: "created_at:desc",
  id_prefix: "inc",
  fields: {
    title: {
      type: "string",
      required: true,
      search: true,
      normalize: (v) => String(v ?? "").trim(),
    },
    description: { type: "string", search: true, normalize: nullish_string },
    employee_id: { type: "string", normalize: nullish_string },
    type: { type: "string" },
    severity: { type: "string" },
    status: { type: "string", update: true, create: true },
    occurred_at: { type: "string", normalize: nullish_string },
    location: { type: "string", search: true, normalize: nullish_string },
    reported_by: { type: "string", search: true, normalize: nullish_string },
    assigned_to: { type: "string", normalize: nullish_string },
    resolution_note: { type: "string", normalize: nullish_string },
    folio: { type: "string", create: false, update: false, search: true },
    closed_at: { type: "string", create: false, update: true },
    active: { type: "boolean" },
  },
  hooks: {
    before_create: prepare_incident_create,
    before_update: prepare_incident_update,
  },
});

const workflow = define_routes({
  "POST /incidents/:id/review": (ctx) => transition_incident(ctx, "review"),
  "POST /incidents/:id/start": (ctx) => transition_incident(ctx, "start"),
  "POST /incidents/:id/resolve": (ctx) => transition_incident(ctx, "resolve"),
  "POST /incidents/:id/close": (ctx) => transition_incident(ctx, "close"),
  "POST /incidents/:id/cancel": (ctx) => transition_incident(ctx, "cancel"),
  "POST /incidents/:id/reopen": (ctx) => transition_incident(ctx, "reopen"),
});

export const incidents_module = define_module({
  resource: "incidents",
  labels: {
    singular: "Incidencia",
    plural: "Incidencias",
    read: "Ver incidencias",
    write: "Registrar y gestionar incidencias",
  },
  routes: [...workflow, ...crud],
  tables: incidents_tables,
  pages: incidents_pages,
  menu: [
    {
      id: "hr.incidents",
      label: "Incidencias",
      order: 70,
      pageId: "hr.incidents",
      path: "incidents",
      permission: "kirlet.hr.incidents.read",
      icon: "warning",
    },
  ],
});
