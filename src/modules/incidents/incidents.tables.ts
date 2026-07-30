import type { KirletTableDecl } from "@opus-perpetuus/kirel-nox-kit";

export const incidents_tables: KirletTableDecl[] = [
  {
    name: "incidents",
    columns: [
      { name: "id", type: "text", primaryKey: true },
      { name: "folio", type: "text", notNull: true, unique: true },
      { name: "title", type: "text", notNull: true },
      { name: "description", type: "text" },
      {
        name: "employee_id",
        type: "text",
        references: { table: "employees", onDelete: "SET NULL" },
      },
      { name: "type", type: "text", notNull: true, default: "otro" },
      { name: "severity", type: "text", notNull: true, default: "media" },
      { name: "status", type: "text", notNull: true, default: "abierta" },
      { name: "occurred_at", type: "text" },
      { name: "location", type: "text" },
      { name: "reported_by", type: "text" },
      { name: "assigned_to", type: "text" },
      { name: "resolution_note", type: "text" },
      { name: "closed_at", type: "text" },
      { name: "active", type: "boolean", notNull: true, default: true },
      { name: "created_at", type: "text", notNull: true },
      { name: "updated_at", type: "text", notNull: true },
    ],
    indexes: [
      { name: "idx_incidents_employee", columns: ["employee_id"] },
      { name: "idx_incidents_status", columns: ["status"] },
      { name: "idx_incidents_type", columns: ["type"] },
      { name: "idx_incidents_severity", columns: ["severity"] },
      { name: "idx_incidents_active", columns: ["active"] },
    ],
  },
];
