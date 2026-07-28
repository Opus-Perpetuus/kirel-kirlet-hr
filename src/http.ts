// (o==================================================================o)
//   #region HTTP HELPERS
// (o-----------------------------------------------------------\/-----o)

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function error(
  code: string,
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
): Response {
  return json({ error: code, message, ...extra }, status);
}

export function not_found(path?: string): Response {
  return json({ error: "not_found", path }, 404);
}

export function method_not_allowed(allowed: string[]): Response {
  return new Response(
    JSON.stringify({ error: "method_not_allowed", allowed }),
    {
      status: 405,
      headers: {
        "content-type": "application/json; charset=utf-8",
        allow: allowed.join(", "),
      },
    },
  );
}

export type MultipartFile = {
  field: string;
  name: string;
  type: string;
  size: number;
  data: Uint8Array;
};

export type MultipartResult = {
  fields: Record<string, string>;
  files: MultipartFile[];
};

/** Parse multipart/form-data via Bun Request.formData(). */
export async function read_multipart(req: Request): Promise<MultipartResult> {
  const form = await req.formData();
  const fields: Record<string, string> = {};
  const files: MultipartFile[] = [];

  for (const [key, value] of form.entries()) {
    if (typeof value === "string") {
      fields[key] = value;
      continue;
    }
    // File / Blob
    const blob = value as File;
    const buf = new Uint8Array(await blob.arrayBuffer());
    files.push({
      field: key,
      name: blob.name || "upload",
      type: blob.type || "application/octet-stream",
      size: buf.byteLength,
      data: buf,
    });
  }

  return { fields, files };
}

export function new_id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function now_iso(): string {
  return new Date().toISOString();
}

export function today_iso(): string {
  return new Date().toISOString().slice(0, 10);
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion HTTP HELPERS
// (o==================================================================o)
