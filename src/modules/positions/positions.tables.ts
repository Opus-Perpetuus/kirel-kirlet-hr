import type { KirletTableDecl } from "@opus-perpetuus/kirel-nox-kit";

export const positions_tables: KirletTableDecl[] = [
  {
    name: "positions",
    columns: [
      { name: "id", type: "text", primaryKey: true },
      { name: "name", type: "text", notNull: true, unique: true },
      {
        name: "department_id",
        type: "text",
        references: { table: "departments", onDelete: "SET NULL" },
      },
      { name: "description", type: "text" },
      { name: "active", type: "boolean", notNull: true, default: true },
      { name: "created_at", type: "text", notNull: true },
      { name: "updated_at", type: "text", notNull: true },
    ],
  },
];
