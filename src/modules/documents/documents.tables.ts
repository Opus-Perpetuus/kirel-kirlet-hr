import type { KirletTableDecl } from "@opus-perpetuus/kirel-nox-kit";

export const documents_tables: KirletTableDecl[] = [
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
];
