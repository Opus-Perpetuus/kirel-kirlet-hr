// (o==================================================================o)
//   #region DOCUMENTS ROUTES
// (o-----------------------------------------------------------\/-----o)

import { parse_list_query } from "@opus-perpetuus/kirel-nox-kit";
import type { KirletIdentity } from "@opus-perpetuus/kirel-nox-kit";
import { mkdirSync, writeFileSync, unlinkSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { get_db } from "../../db.ts";
import { get_files_dir } from "../../config.ts";
import {
  json,
  error,
  not_found,
  method_not_allowed,
  new_id,
  now_iso,
  read_multipart,
} from "../../http.ts";
import { require_access, actor_from } from "../../auth.ts";
import { append_history } from "../../history.ts";
import {
  validate_document_file,
  type DocumentRow,
} from "./schema.ts";

export async function handle_documents(
  req: Request,
  path: string,
  url: URL,
  identity: KirletIdentity | null,
): Promise<Response | null> {
  const download = path.match(/^\/documents\/([^/]+)\/download$/);
  if (download) {
    if (req.method !== "GET") return method_not_allowed(["GET"]);
    const denied = require_access(identity, "documents", "read");
    if (denied) return denied;
    return download_file(download[1]!);
  }

  const one = path.match(/^\/documents\/([^/]+)$/);
  if (one) {
    const id = one[1]!;
    if (req.method === "GET") {
      const denied = require_access(identity, "documents", "read");
      if (denied) return denied;
      return get_one(id);
    }
    if (req.method === "DELETE") {
      const denied = require_access(identity, "documents", "delete");
      if (denied) return denied;
      return remove(id, identity);
    }
    return method_not_allowed(["GET", "DELETE"]);
  }

  if (path === "/documents") {
    if (req.method === "GET") {
      const denied = require_access(identity, "documents", "read");
      if (denied) return denied;
      return list(url);
    }
    if (req.method === "POST") {
      const denied = require_access(identity, "documents", "create");
      if (denied) return denied;
      return upload(req, identity);
    }
    return method_not_allowed(["GET", "POST"]);
  }

  return null;
}

function map_row(r: Record<string, unknown>): DocumentRow {
  return {
    id: String(r.id),
    employee_id: String(r.employee_id),
    title: String(r.title),
    doc_type: String(r.doc_type ?? "otro"),
    file_name: String(r.file_name),
    mime_type: String(r.mime_type),
    size_bytes: Number(r.size_bytes),
    storage_path: String(r.storage_path),
    uploaded_by: (r.uploaded_by as string) ?? null,
    created_at: String(r.created_at),
  };
}

function public_doc(d: DocumentRow) {
  const { storage_path: _, ...rest } = d;
  return rest;
}

function list(url: URL): Response {
  const db = get_db();
  const q = parse_list_query(url.searchParams);
  const where: string[] = [];
  const params: unknown[] = [];
  const employee_id = url.searchParams.get("employee_id");
  if (employee_id) {
    where.push("employee_id = ?");
    params.push(employee_id);
  }
  if (q.q) {
    where.push(`(title LIKE ? OR file_name LIKE ? OR doc_type LIKE ?)`);
    const like = `%${q.q}%`;
    params.push(like, like, like);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (
    db
      .query(`SELECT COUNT(*) AS c FROM documents ${clause}`)
      .get(...params) as { c: number }
  ).c;
  const rows = db
    .query(
      `SELECT * FROM documents ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, q.take, q.skip) as Array<Record<string, unknown>>;
  return json({
    data: rows.map((r) => public_doc(map_row(r))),
    total,
  });
}

function get_one(id: string): Response {
  const db = get_db();
  const r = db
    .query(`SELECT * FROM documents WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!r) return not_found(`/documents/${id}`);
  return json({ data: public_doc(map_row(r)) });
}

async function upload(
  req: Request,
  identity: KirletIdentity | null,
): Promise<Response> {
  try {
    const content_type = req.headers.get("content-type") ?? "";
    if (!content_type.includes("multipart/form-data")) {
      return error(
        "validation_error",
        "Se espera multipart/form-data",
        400,
      );
    }

    const { fields, files } = await read_multipart(req);
    const file = files.find((f) => f.field === "file") ?? files[0];
    if (!file) {
      return error("validation_error", "Archivo (file) es requerido", 400);
    }

    const check = validate_document_file({
      size: file.size,
      mime: file.type,
      name: file.name,
    });
    if (!check.ok) {
      return error(check.code, check.message, check.status);
    }

    const employee_id = String(fields.employee_id ?? "").trim();
    if (!employee_id) {
      return error("validation_error", "employee_id es requerido", 400);
    }
    const db = get_db();
    const emp = db
      .query(`SELECT id FROM employees WHERE id = ?`)
      .get(employee_id) as { id: string } | null;
    if (!emp) {
      return error("validation_error", "employee_id no existe", 400);
    }

    const title =
      String(fields.title ?? "").trim() || file.name || "Documento";
    const doc_type = String(fields.doc_type ?? "otro").trim() || "otro";
    const id = new_id("doc");
    const iso = now_iso();
    const files_dir = get_files_dir();
    mkdirSync(files_dir, { recursive: true });
    const safe_name = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storage_path = join(files_dir, `${id}_${safe_name}`);
    writeFileSync(storage_path, file.data);

    const rec: DocumentRow = {
      id,
      employee_id,
      title,
      doc_type,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      storage_path,
      uploaded_by: actor_from(identity),
      created_at: iso,
    };

    db.query(
      `INSERT INTO documents (
        id, employee_id, title, doc_type, file_name, mime_type,
        size_bytes, storage_path, uploaded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      rec.id,
      rec.employee_id,
      rec.title,
      rec.doc_type,
      rec.file_name,
      rec.mime_type,
      rec.size_bytes,
      rec.storage_path,
      rec.uploaded_by,
      rec.created_at,
    );

    append_history({
      resource: "documents",
      record_id: id,
      action: "create",
      summary: `Documento subido: ${rec.title}`,
      payload: { after: public_doc(rec) },
      actor: actor_from(identity),
    });

    return json({ data: public_doc(rec) }, 201);
  } catch (err) {
    return error(
      "validation_error",
      err instanceof Error ? err.message : String(err),
      400,
    );
  }
}

function download_file(id: string): Response {
  const db = get_db();
  const r = db
    .query(`SELECT * FROM documents WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!r) return not_found(`/documents/${id}`);
  const doc = map_row(r);
  if (!existsSync(doc.storage_path)) {
    return error("not_found", "Archivo no encontrado en disco", 404);
  }
  const data = readFileSync(doc.storage_path);
  return new Response(data, {
    status: 200,
    headers: {
      "content-type": doc.mime_type,
      "content-disposition": `attachment; filename="${doc.file_name.replace(/"/g, "")}"`,
      "content-length": String(data.byteLength),
    },
  });
}

function remove(id: string, identity: KirletIdentity | null): Response {
  const db = get_db();
  const r = db
    .query(`SELECT * FROM documents WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!r) return not_found(`/documents/${id}`);
  const before = map_row(r);
  db.query(`DELETE FROM documents WHERE id = ?`).run(id);
  if (existsSync(before.storage_path)) {
    try {
      unlinkSync(before.storage_path);
    } catch {
      /* ignore */
    }
  }
  append_history({
    resource: "documents",
    record_id: id,
    action: "delete",
    summary: `Documento eliminado: ${before.title}`,
    payload: { before: public_doc(before) },
    actor: actor_from(identity),
  });
  return json({ data: public_doc(before) });
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DOCUMENTS ROUTES
// (o==================================================================o)
