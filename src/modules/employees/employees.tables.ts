import type { KirletTableDecl } from "@opus-perpetuus/kirel-nox-kit";

export const employees_tables: KirletTableDecl[] = [
  {
    name: "employees",
    columns: [
      { name: "id", type: "text", primaryKey: true },
      { name: "name", type: "text", notNull: true },
      { name: "full_name", type: "text", notNull: true },
      { name: "email", type: "text", notNull: true, unique: true },
      {
        name: "department_id",
        type: "text",
        references: { table: "departments", onDelete: "SET NULL" },
      },
      {
        name: "position_id",
        type: "text",
        references: { table: "positions", onDelete: "SET NULL" },
      },
      {
        name: "manager_id",
        type: "text",
        references: { table: "employees", onDelete: "SET NULL" },
      },
      { name: "user_id", type: "text" },
      { name: "hired_at", type: "text" },
      { name: "phone", type: "text" },
      { name: "rfc", type: "text" },
      { name: "curp", type: "text" },
      { name: "nss", type: "text" },
      { name: "active", type: "boolean", notNull: true, default: true },
      { name: "created_at", type: "text", notNull: true },
      { name: "updated_at", type: "text", notNull: true },
    ],
    indexes: [
      { name: "idx_employees_department", columns: ["department_id"] },
      { name: "idx_employees_manager", columns: ["manager_id"] },
      { name: "idx_employees_user", columns: ["user_id"] },
    ],
  },
];
