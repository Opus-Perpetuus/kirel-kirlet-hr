import type { KirletTableDecl } from "@opus-perpetuus/kirel-nox-kit";

export const departments_tables: KirletTableDecl[] = [
  {
    name: "departments",
    columns: [
      { name: "id", type: "text", primaryKey: true },
      { name: "name", type: "text", notNull: true, unique: true },
      { name: "description", type: "text" },
      { name: "active", type: "boolean", notNull: true, default: true },
      { name: "created_at", type: "text", notNull: true },
      { name: "updated_at", type: "text", notNull: true },
    ],
  },
];
