// (o==================================================================o)
//   #region DB TESTS
// (o-----------------------------------------------------------\/-----o)

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { close_db, init_db, run_migrations, get_db } from "./db.ts";

describe("db migrations", () => {
  let data_dir: string;
  let db_path: string;

  beforeAll(() => {
    data_dir = mkdtempSync(join(tmpdir(), "kirlet-hr-db-"));
    db_path = join(data_dir, "hr.db");
    process.env.DATA_DIR = data_dir;
  });

  afterAll(() => {
    close_db();
    rmSync(data_dir, { recursive: true, force: true });
  });

  test("migrations apply once on temp DATA_DIR", () => {
    init_db(db_path);
    const first = run_migrations();
    // 001 already applied by init_db
    expect(first).toEqual([]);

    const tables = get_db()
      .query(
        `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
      )
      .all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name);
    expect(names).toContain("employees");
    expect(names).toContain("departments");
    expect(names).toContain("positions");
    expect(names).toContain("contracts");
    expect(names).toContain("leave_types");
    expect(names).toContain("leave_requests");
    expect(names).toContain("leave_balances");
    expect(names).toContain("documents");
    expect(names).toContain("history");
    expect(names).toContain("_migrations");

    const applied = get_db()
      .query(`SELECT name FROM _migrations`)
      .all() as Array<{ name: string }>;
    expect(applied.some((a) => a.name === "001_init.sql")).toBe(true);

    // Second open: still once
    close_db();
    init_db(db_path);
    const second = run_migrations();
    expect(second).toEqual([]);
  });
});

// (o-----------------------------------------------------------/\-----o)
//   #endregion DB TESTS
// (o==================================================================o)
