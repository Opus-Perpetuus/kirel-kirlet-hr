import {
  define_crud,
  define_module,
  KirletHttpError,
} from "@opus-perpetuus/kirel-nox-kit";
import { positions_pages } from "./positions.pages.ts";
import { positions_tables } from "./positions.tables.ts";

const nullish_string = (v: unknown) =>
  v == null || v === "" ? null : String(v).trim() || null;

const routes = define_crud({
  resource: "positions",
  table: "positions",
  soft_delete: true,
  history: true,
  default_sort: "name:asc",
  id_prefix: "pos",
  fields: {
    name: {
      type: "string",
      required: true,
      search: true,
      normalize: (v) => String(v ?? "").trim(),
    },
    department_id: { type: "string", normalize: nullish_string },
    description: { type: "string", search: true, normalize: nullish_string },
    active: { type: "boolean" },
  },
  options_map: { value: "id", label: "name" },
  hooks: {
    before_create: async (ctx, row) => {
      const name = String(row["name"] ?? "").trim();
      const dup = await ctx.data.findOne("positions", { name });
      if (dup) {
        throw new KirletHttpError(409, "conflict", "El puesto ya existe");
      }
      return {
        ...row,
        name,
        department_id: row["department_id"] ?? null,
        description: row["description"] ?? null,
      };
    },
    before_update: async (ctx, id, patch, existing) => {
      if (patch["name"] != null && patch["name"] !== existing["name"]) {
        const dup = await ctx.data.findOne("positions", {
          name: String(patch["name"]),
        });
        if (dup && String(dup.id) !== id) {
          throw new KirletHttpError(409, "conflict", "El puesto ya existe");
        }
      }
      return patch;
    },
  },
});

export const positions_module = define_module({
  resource: "positions",
  labels: {
    singular: "Puesto",
    plural: "Puestos",
    read: "Ver puestos",
    write: "Editar puestos",
  },
  routes,
  tables: positions_tables,
  pages: positions_pages,
  menu: [
    {
      id: "hr.positions",
      label: "Puestos",
      order: 30,
      pageId: "hr.positions",
      path: "positions",
      permission: "kirlet.hr.positions.read",
      icon: "briefcase",
    },
  ],
});
