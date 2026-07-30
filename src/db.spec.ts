// (o==================================================================o)
//   #region DATA CLIENT / SCHEMA TESTS
// (o-----------------------------------------------------------\/-----o)

import { describe, expect, test, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { KirletRepository } from "@opus-perpetuus/kirel-nox-kit";
import { HR_SCHEMA } from "./schema/hr.schema.ts";
import {
  reset_hr_app_for_tests,
  close_hr_app,
  get_data,
} from "./app/hr-app.ts";

describe("kit data bootstrap + schema", () => {
  let data_dir: string;

  afterAll(() => {
    close_hr_app();
    if (data_dir) rmSync(data_dir, { recursive: true, force: true });
  });

  test("HR_SCHEMA declares domain tables (no private SQLite)", () => {
    data_dir = mkdtempSync(join(tmpdir(), "kirlet-hr-data-"));
    process.env.DATA_DIR = data_dir;
    const mem = reset_hr_app_for_tests();
    expect(mem).toBeTruthy();

    const names = HR_SCHEMA.tables.map((t) => t.name);
    expect(names).toContain("employees");
    expect(names).toContain("departments");
    expect(names).toContain("positions");
    expect(names).toContain("contracts");
    expect(names).toContain("leave_types");
    expect(names).toContain("leave_requests");
    expect(names).toContain("leave_balances");
    expect(names).toContain("documents");
    expect(names).toContain("history");
    expect(names).toContain("incidents");

    const repo = new KirletRepository(get_data(), "employees");
    expect(typeof repo.findMany).toBe("function");
  });
});

// (o-----------------------------------------------------------/\-----o)
//   #endregion DATA CLIENT / SCHEMA TESTS
// (o==================================================================o)
