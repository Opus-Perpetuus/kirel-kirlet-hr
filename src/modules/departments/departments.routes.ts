import {
  define_crud,
  define_module,
  KirletHttpError,
} from "@opus-perpetuus/kirel-nox-kit";
import { departments_pages } from "./departments.pages.ts";
import { departments_tables } from "./departments.tables.ts";

const nullish_string = (v: unknown) =>
  v == null || v === "" ? null : String(v).trim() || null;

const routes = define_crud({
  resource: "departments",
  table: "departments",
  soft_delete: true,
  history: true,
  default_sort: "name:asc",
  id_prefix: "dep",
  fields: {
    name: {
      type: "string",
      required: true,
      search: true,
      normalize: (v) => String(v ?? "").trim(),
    },
    description: { type: "string", search: true, normalize: nullish_string },
    active: { type: "boolean" },
  },
  options_map: { value: "id", label: "name" },
  hooks: {
    before_create: async (ctx, row) => {
      const name = String(row["name"] ?? "").trim();
      const dup = await ctx.data.findOne("departments", { name });
      if (dup) {
        throw new KirletHttpError(409, "conflict", "El departamento ya existe");
      }
      return { ...row, name, description: row["description"] ?? null };
    },
    before_update: async (ctx, id, patch, existing) => {
      if (patch["name"] != null && patch["name"] !== existing["name"]) {
        const dup = await ctx.data.findOne("departments", {
          name: String(patch["name"]),
        });
        if (dup && String(dup.id) !== id) {
          throw new KirletHttpError(
            409,
            "conflict",
            "El departamento ya existe",
          );
        }
      }
      return patch;
    },
    before_delete: async (ctx, row) => {
      const active_emps = await ctx.data.count("employees", {
        department_id: row.id,
        active: true,
      });
      if (active_emps > 0) {
        throw new KirletHttpError(
          409,
          "conflict",
          `No se puede eliminar: hay ${active_emps} empleado(s) activo(s) en el departamento`,
        );
      }
    },
  },
});

export const departments_module = define_module({
  resource: "departments",
  labels: {
    singular: "Departamento",
    plural: "Departamentos",
    read: "Ver departamentos",
    write: "Editar departamentos",
  },
  routes,
  tables: departments_tables,
  pages: departments_pages,
  menu: [
    {
      id: "hr.departments",
      label: "Departamentos",
      order: 20,
      pageId: "hr.departments",
      path: "departments",
      permission: "kirlet.hr.departments.read",
      icon: "building",
    },
  ],
});
