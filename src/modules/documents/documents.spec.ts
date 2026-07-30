import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  create_kirlet_test_context,
  new_id,
  now_iso,
  today_iso,
  type KirletServer,
} from "@opus-perpetuus/kirel-nox-kit";
import { KIRLET } from "../../kirlet.ts";
import {
  ALLOWED_MIME,
  MAX_DOCUMENT_BYTES,
  validate_document_file,
} from "./documents.service.ts";

describe("documents", () => {
  let server: KirletServer;
  let employee_id: string;

  beforeEach(async () => {
    server = create_kirlet_test_context(KIRLET);
    const iso = now_iso();
    employee_id = new_id("emp");
    await server.data.insert("employees", {
      id: employee_id,
      name: "Doc",
      full_name: "Doc User",
      email: "doc@t.local",
      department_id: null,
      position_id: null,
      manager_id: null,
      user_id: null,
      hired_at: today_iso(),
      phone: null,
      rfc: null,
      curp: null,
      nss: null,
      active: true,
      created_at: iso,
      updated_at: iso,
    });
  });

  afterEach(() => {
    server.stop();
  });

  test("size cap → 413", () => {
    const check = validate_document_file({
      size: MAX_DOCUMENT_BYTES + 1,
      mime: "application/pdf",
      name: "big.pdf",
    });
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.status).toBe(413);
    }
  });

  test("mime rules reject executables", () => {
    const check = validate_document_file({
      size: 100,
      mime: "application/x-msdownload",
      name: "virus.exe",
    });
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.status).toBe(415);
    }
  });

  test("pdf is allowed", () => {
    expect(ALLOWED_MIME.has("application/pdf")).toBe(true);
    const check = validate_document_file({
      size: 100,
      mime: "application/pdf",
      name: "cv.pdf",
    });
    expect(check.ok).toBe(true);
  });

  test("multipart upload + download + delete", async () => {
    const form = new FormData();
    form.set("employee_id", employee_id);
    form.set("title", "CURP scan");
    form.set("doc_type", "identificacion");
    form.set(
      "file",
      new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "curp.pdf", {
        type: "application/pdf",
      }),
    );

    const up = await server.fetch(
      new Request("http://t/documents", {
        method: "POST",
        body: form,
      }),
    );
    expect(up.status).toBe(201);
    const { data } = (await up.json()) as {
      data: { id: string; title: string };
    };
    expect(data.title).toBe("CURP scan");

    const dl = await server.fetch(
      new Request(`http://t/documents/${data.id}/download`),
    );
    expect(dl.status).toBe(200);
    expect(dl.headers.get("content-type")).toContain("pdf");

    const del = await server.fetch(
      new Request(`http://t/documents/${data.id}`, { method: "DELETE" }),
    );
    expect(del.status).toBe(200);
  });

  test("oversized multipart returns 413", async () => {
    const big = new Uint8Array(MAX_DOCUMENT_BYTES + 10);
    const form = new FormData();
    form.set("employee_id", employee_id);
    form.set("title", "Huge");
    form.set(
      "file",
      new File([big], "huge.pdf", { type: "application/pdf" }),
    );
    const res = await server.fetch(
      new Request("http://t/documents", { method: "POST", body: form }),
    );
    expect(res.status).toBe(413);
  });
});
