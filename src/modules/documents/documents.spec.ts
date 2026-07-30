// (o==================================================================o)
//   #region DOCUMENTS TESTS
// (o-----------------------------------------------------------\/-----o)

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { KirletRepository } from "@opus-perpetuus/kirel-nox-kit";
import {
  reset_hr_app_for_tests,
  close_hr_app,
  get_data,
} from "../../app/hr-app.ts";
import { seed_leave_types } from "../../seed.ts";
import { handle_request } from "../../server.ts";
import { new_id, now_iso, today_iso } from "../../http.ts";
import { validate_document_file, ALLOWED_MIME } from "./schema.ts";
import { MAX_DOCUMENT_BYTES } from "../../config.ts";

describe("documents", () => {
  let data_dir: string;
  let employee_id: string;

  beforeAll(async () => {
    data_dir = mkdtempSync(join(tmpdir(), "kirlet-hr-docs-"));
    process.env.DATA_DIR = data_dir;
    process.env.KIRLET_AUTH = "off";
    process.env.KIRLET_SEED_DEMO = "0";
    reset_hr_app_for_tests();
    await seed_leave_types();

    const employees = new KirletRepository(get_data(), "employees");
    const iso = now_iso();
    employee_id = new_id("emp");
    await employees.insert({
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
      is_active: 1,
      created_at: iso,
      updated_at: iso,
    });
  });

  afterAll(() => {
    close_hr_app();
    rmSync(data_dir, { recursive: true, force: true });
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

    const up = await handle_request(
      new Request("http://local/documents", {
        method: "POST",
        body: form,
      }),
    );
    expect(up.status).toBe(201);
    const { data } = (await up.json()) as {
      data: { id: string; title: string };
    };
    expect(data.title).toBe("CURP scan");

    const dl = await handle_request(
      new Request(`http://local/documents/${data.id}/download`),
    );
    expect(dl.status).toBe(200);
    expect(dl.headers.get("content-type")).toContain("pdf");

    const del = await handle_request(
      new Request(`http://local/documents/${data.id}`, { method: "DELETE" }),
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
    const res = await handle_request(
      new Request("http://local/documents", { method: "POST", body: form }),
    );
    expect(res.status).toBe(413);
  });
});

// (o-----------------------------------------------------------/\-----o)
//   #endregion DOCUMENTS TESTS
// (o==================================================================o)
