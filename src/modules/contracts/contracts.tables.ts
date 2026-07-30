import type { KirletTableDecl } from "@opus-perpetuus/kirel-nox-kit";

export const contracts_tables: KirletTableDecl[] = [
  {
    name: "contracts",
    columns: [
      { name: "id", type: "text", primaryKey: true },
      {
        name: "employee_id",
        type: "text",
        notNull: true,
        references: { table: "employees", onDelete: "CASCADE" },
      },
      { name: "type", type: "text", notNull: true },
      { name: "start_date", type: "text", notNull: true },
      { name: "end_date", type: "text" },
      { name: "salary", type: "real", notNull: true, default: 0 },
      { name: "currency", type: "text", notNull: true, default: "MXN" },
      { name: "schedule", type: "text", notNull: true, default: "completa" },
      { name: "status", type: "text", notNull: true, default: "activo" },
      { name: "notes", type: "text" },
      { name: "created_at", type: "text", notNull: true },
      { name: "updated_at", type: "text", notNull: true },
    ],
    indexes: [{ name: "idx_contracts_employee", columns: ["employee_id"] }],
  },
];
