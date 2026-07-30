// (o==================================================================o)
//   #region HR DOMAIN SCHEMA (declarative — NOX applies to shared Postgres)
// (o-----------------------------------------------------------\/-----o)

import type { KirletSchemaBundle } from "@opus-perpetuus/kirel-nox-kit";

/**
 * Full domain schema for KIRLET-hr.
 * Kirlet process never runs this DDL; NOX applies it on install/start.
 */
export const HR_SCHEMA: KirletSchemaBundle = {
  technicalId: "kirlet-hr",
  version: 1,
  tables: [
    {
      name: "departments",
      columns: [
        { name: "id", type: "text", primaryKey: true },
        { name: "name", type: "text", notNull: true, unique: true },
        { name: "description", type: "text" },
        { name: "is_active", type: "integer", notNull: true, default: 1 },
        { name: "created_at", type: "text", notNull: true },
        { name: "updated_at", type: "text", notNull: true },
      ],
    },
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
        { name: "is_active", type: "integer", notNull: true, default: 1 },
        { name: "created_at", type: "text", notNull: true },
        { name: "updated_at", type: "text", notNull: true },
      ],
    },
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
        { name: "is_active", type: "integer", notNull: true, default: 1 },
        { name: "created_at", type: "text", notNull: true },
        { name: "updated_at", type: "text", notNull: true },
      ],
      indexes: [
        { name: "idx_employees_department", columns: ["department_id"] },
        { name: "idx_employees_manager", columns: ["manager_id"] },
        { name: "idx_employees_user", columns: ["user_id"] },
      ],
    },
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
    {
      name: "leave_types",
      columns: [
        { name: "id", type: "text", primaryKey: true },
        { name: "name", type: "text", notNull: true, unique: true },
        { name: "paid", type: "integer", notNull: true, default: 1 },
        { name: "max_days_per_year", type: "real" },
        { name: "is_active", type: "integer", notNull: true, default: 1 },
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
    {
      name: "documents",
      columns: [
        { name: "id", type: "text", primaryKey: true },
        {
          name: "employee_id",
          type: "text",
          notNull: true,
          references: { table: "employees", onDelete: "CASCADE" },
        },
        { name: "title", type: "text", notNull: true },
        { name: "doc_type", type: "text", notNull: true, default: "otro" },
        { name: "file_name", type: "text", notNull: true },
        { name: "mime_type", type: "text", notNull: true },
        { name: "size_bytes", type: "integer", notNull: true },
        { name: "storage_path", type: "text", notNull: true },
        { name: "uploaded_by", type: "text" },
        { name: "created_at", type: "text", notNull: true },
      ],
      indexes: [{ name: "idx_documents_employee", columns: ["employee_id"] }],
    },
    {
      name: "history",
      columns: [
        { name: "id", type: "text", primaryKey: true },
        { name: "resource", type: "text", notNull: true },
        { name: "record_id", type: "text", notNull: true },
        { name: "action", type: "text", notNull: true },
        { name: "summary", type: "text", notNull: true },
        { name: "payload", type: "text" },
        { name: "actor", type: "text" },
        { name: "created_at", type: "text", notNull: true },
      ],
      indexes: [
        { name: "idx_history_record", columns: ["resource", "record_id"] },
      ],
    },
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
        { name: "is_active", type: "integer", notNull: true, default: 1 },
        { name: "created_at", type: "text", notNull: true },
        { name: "updated_at", type: "text", notNull: true },
      ],
      indexes: [
        { name: "idx_incidents_employee", columns: ["employee_id"] },
        { name: "idx_incidents_status", columns: ["status"] },
        { name: "idx_incidents_type", columns: ["type"] },
        { name: "idx_incidents_severity", columns: ["severity"] },
        { name: "idx_incidents_active", columns: ["is_active"] },
      ],
    },
  ],
};

// (o-----------------------------------------------------------/\-----o)
//   #endregion HR DOMAIN SCHEMA
// (o==================================================================o)
