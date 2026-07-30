// (o==================================================================o)
//   #region DOCUMENTS SERVICE (multipart + file store)
// (o-----------------------------------------------------------\/-----o)

import {
  KirletHttpError,
  new_id,
  now_iso,
  type DomainRow,
  type KirletCtx,
} from "@opus-perpetuus/kirel-nox-kit";

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.text",
  "application/zip",
]);

export function validate_document_file(opts: {
  size: number;
  mime: string;
  name: string;
}):
  | { ok: true }
  | { ok: false; status: number; code: string; message: string } {
  if (opts.size > MAX_DOCUMENT_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "payload_too_large",
      message: `El archivo supera el límite de ${MAX_DOCUMENT_BYTES} bytes (20 MB)`,
    };
  }
  if (opts.size <= 0) {
    return {
      ok: false,
      status: 400,
      code: "validation_error",
      message: "El archivo está vacío",
    };
  }
  const mime = (opts.mime || "application/octet-stream").toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    const ext = opts.name.split(".").pop()?.toLowerCase() ?? "";
    const ext_ok = [
      "pdf",
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
      "txt",
      "csv",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "odt",
    ].includes(ext);
    if (!ext_ok) {
      return {
        ok: false,
        status: 415,
        code: "unsupported_media_type",
        message: `Tipo de archivo no permitido: ${mime}`,
      };
    }
  }
  return { ok: true };
}

function public_doc(d: DomainRow) {
  const { storage_path: _, ...rest } = d;
  return rest;
}

export async function list_documents(ctx: KirletCtx) {
  const lq = ctx.list_query();
  const employee_id = ctx.query.get("employee_id");
  const where = employee_id ? { employee_id } : undefined;
  const search = lq.q
    ? { fields: ["title", "file_name", "doc_type"], q: lq.q }
    : undefined;
  const rows = await ctx.data.findMany("documents", {
    where,
    search,
    orderBy: { created_at: "desc" },
    limit: lq.take,
    offset: lq.skip,
  });
  return { data: rows.map((r) => public_doc(r)) };
}

export async function get_document(ctx: KirletCtx) {
  const row = await ctx.data.findOne("documents", { id: ctx.params.id });
  if (!row) throw new KirletHttpError(404, "not_found", "not found");
  return { data: public_doc(row) };
}

export async function upload_document(ctx: KirletCtx) {
  const content_type = ctx.req.headers.get("content-type") ?? "";
  if (!content_type.includes("multipart/form-data")) {
    throw new KirletHttpError(
      400,
      "validation_error",
      "Se espera multipart/form-data",
    );
  }

  const { fields, files } = await ctx.multipart();
  const file = files.find((f) => f.field === "file") ?? files[0];
  if (!file) {
    throw new KirletHttpError(400, "validation_error", "Archivo (file) es requerido");
  }

  const check = validate_document_file({
    size: file.size,
    mime: file.type,
    name: file.name,
  });
  if (!check.ok) {
    throw new KirletHttpError(check.status, check.code, check.message);
  }

  const employee_id = String(fields.employee_id ?? "").trim();
  if (!employee_id) {
    throw new KirletHttpError(400, "validation_error", "employee_id es requerido", {
      field: "employee_id",
    });
  }
  const emp = await ctx.data.findOne("employees", { id: employee_id });
  if (!emp) {
    throw new KirletHttpError(400, "validation_error", "employee_id no existe", {
      field: "employee_id",
    });
  }

  const title =
    String(fields.title ?? "").trim() || file.name || "Documento";
  const doc_type = String(fields.doc_type ?? "otro").trim() || "otro";
  const id = new_id("doc");
  const iso = now_iso();

  const stored = await ctx.files.save(file.data, {
    name: file.name,
    type: file.type || "application/octet-stream",
    id,
  });

  const rec: DomainRow = {
    id,
    employee_id,
    title,
    doc_type,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    storage_path: stored.relative_path,
    uploaded_by: ctx.actor,
    created_at: iso,
  };

  await ctx.data.insert("documents", rec);
  await ctx.nox.history.append({
    resource: "documents",
    action: "create",
    entity_id: id,
    actor_id: ctx.identity?.user_id ?? null,
    actor_label: ctx.actor,
    payload: { after: public_doc(rec) },
  });

  return ctx.created(public_doc(rec));
}

export async function download_document(ctx: KirletCtx) {
  const row = await ctx.data.findOne("documents", { id: ctx.params.id });
  if (!row) throw new KirletHttpError(404, "not_found", "not found");
  const path = String(row["storage_path"]);
  const data = await ctx.files.read(path);
  if (!data) {
    throw new KirletHttpError(404, "not_found", "Archivo no encontrado en disco");
  }
  const file_name = String(row["file_name"] ?? "file").replace(/"/g, "");
  return new Response(data, {
    status: 200,
    headers: {
      "content-type": String(row["mime_type"] ?? "application/octet-stream"),
      "content-disposition": `attachment; filename="${file_name}"`,
      "content-length": String(data.byteLength),
    },
  });
}

export async function delete_document(ctx: KirletCtx) {
  const id = ctx.params.id;
  const row = await ctx.data.findOne("documents", { id });
  if (!row) throw new KirletHttpError(404, "not_found", "not found");
  await ctx.data.delete("documents", { id });
  try {
    await ctx.files.remove(String(row["storage_path"]));
  } catch {
    /* ignore */
  }
  await ctx.nox.history.append({
    resource: "documents",
    action: "delete",
    entity_id: id,
    actor_id: ctx.identity?.user_id ?? null,
    actor_label: ctx.actor,
    payload: { before: public_doc(row) },
  });
  return { data: public_doc(row) };
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DOCUMENTS SERVICE
// (o==================================================================o)
