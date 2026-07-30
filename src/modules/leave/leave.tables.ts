import type { KirletTableDecl } from "@opus-perpetuus/kirel-nox-kit";

export const leave_tables: KirletTableDecl[] = [
  {
    name: "leave_types",
    columns: [
      { name: "id", type: "text", primaryKey: true },
      { name: "name", type: "text", notNull: true, unique: true },
      { name: "paid", type: "integer", notNull: true, default: 1 },
      { name: "max_days_per_year", type: "real" },
      { name: "active", type: "boolean", notNull: true, default: true },
      { name: "created_at", type: "text", notNull: true },
      { name: "updated_at", type: "text", notNull: true },
    ],
  },
  {
    name: "leave_requests",
    columns: [
      { name: "id", type: "text", primaryKey: true },
      {
        name: "employee_id",
        type: "text",
        notNull: true,
        references: { table: "employees", onDelete: "CASCADE" },
      },
      {
        name: "leave_type_id",
        type: "text",
        notNull: true,
        references: { table: "leave_types" },
      },
      { name: "start_date", type: "text", notNull: true },
      { name: "end_date", type: "text", notNull: true },
      { name: "days", type: "real", notNull: true },
      { name: "reason", type: "text" },
      { name: "status", type: "text", notNull: true, default: "pendiente" },
      { name: "decided_by", type: "text" },
      { name: "decided_at", type: "text" },
      { name: "decision_note", type: "text" },
      { name: "created_at", type: "text", notNull: true },
      { name: "updated_at", type: "text", notNull: true },
    ],
    indexes: [
      { name: "idx_leave_requests_employee", columns: ["employee_id"] },
      { name: "idx_leave_requests_status", columns: ["status"] },
    ],
  },
  {
    name: "leave_balances",
    columns: [
      { name: "id", type: "text", primaryKey: true },
      {
        name: "employee_id",
        type: "text",
        notNull: true,
        references: { table: "employees", onDelete: "CASCADE" },
      },
      {
        name: "leave_type_id",
        type: "text",
        notNull: true,
        references: { table: "leave_types" },
      },
      { name: "year", type: "integer", notNull: true },
      { name: "entitled_days", type: "real", notNull: true, default: 0 },
      { name: "used_days", type: "real", notNull: true, default: 0 },
    ],
  },
];
