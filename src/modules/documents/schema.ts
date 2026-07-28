// (o==================================================================o)
//   #region DOCUMENTS SCHEMA
// (o-----------------------------------------------------------\/-----o)

import { MAX_DOCUMENT_BYTES } from "../../config.ts";

export type DocumentRow = {
  id: string;
  employee_id: string;
  title: string;
  doc_type: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
};

/** Allowed MIME types for HR documents. */
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
}): { ok: true } | { ok: false; status: number; code: string; message: string } {
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
    // Allow by extension fallback for common docs without proper mime
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

// (o-----------------------------------------------------------/\-----o)
//   #endregion DOCUMENTS SCHEMA
// (o==================================================================o)
