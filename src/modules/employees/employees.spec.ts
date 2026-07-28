// (o==================================================================o)
//   #region EMPLOYEES TESTS
// (o-----------------------------------------------------------\/-----o)

import { describe, expect, test, beforeAll, afterAll, beforeEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { close_db, init_db, get_db } from "../../db.ts";
import { seed_leave_types } from "../../seed.ts";
import { handle_request } from "../../server.ts";
import { normalize_employee_input } from "./schema.ts";

describe("employees", () => {
  let data_dir: string;

  beforeAll(() => {
    data_dir = mkdtempSync(join(tmpdir(), "kirlet-hr-emp-"));
    process.env.DATA_DIR = data_dir;
    process.env.KIRLET_AUTH = "off";
    process.env.KIRLET_SEED_DEMO = "0";
    init_db(join(data_dir, "hr.db"));
    seed_leave_types();
  });

  afterAll(() => {
    close_db();
    rmSync(data_dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    get_db().exec(`DELETE FROM employees`);
  });

  test("normalize requires full_name/email", () => {
    expect(() => normalize_employee_input({})).toThrow(/full_name/);
    const ok = normalize_employee_input({
      full_name: "  Ada Lovelace  ",
      email: "Ada@Example.COM",
    });
    expect(ok.full_name).toBe("Ada Lovelace");
    expect(ok.email).toBe("ada@example.com");
  });

  test("search / sort / pagination", async () => {
    for (const [name, email] of [
      ["Zeta", "zeta@t.local"],
      ["Alpha", "alpha@t.local"],
      ["Beta", "beta@t.local"],
    ] as const) {
      const res = await handle_request(
        new Request("http://local/employees", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ full_name: name, email }),
        }),
      );
      expect(res.status).toBe(201);
    }

    const sorted = await handle_request(
      new Request("http://local/employees?sort=name:asc&take=2&skip=0"),
    );
    expect(sorted.status).toBe(200);
    const body = (await sorted.json()) as {
      data: Array<{ name: string }>;
      total: number;
    };
    expect(body.total).toBe(3);
    expect(body.data.length).toBe(2);
    expect(body.data[0]!.name).toBe("Alpha");

    const search = await handle_request(
      new Request("http://local/employees?q=beta"),
    );
    const sbody = (await search.json()) as { data: unknown[]; total: number };
    expect(sbody.total).toBe(1);
  });

  test("soft-delete hides from default list", async () => {
    const create = await handle_request(
      new Request("http://local/employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: "Borrar Me",
          email: "borrar@t.local",
        }),
      }),
    );
    const { data } = (await create.json()) as { data: { id: string } };

    const del = await handle_request(
      new Request(`http://local/employees/${data.id}`, { method: "DELETE" }),
    );
    expect(del.status).toBe(200);

    const list = await handle_request(new Request("http://local/employees"));
    const body = (await list.json()) as { total: number };
    expect(body.total).toBe(0);

    const all = await handle_request(
      new Request("http://local/employees?include_inactive=1"),
    );
    const abody = (await all.json()) as { total: number };
    expect(abody.total).toBe(1);
  });

  test("duplicate email returns 409", async () => {
    await handle_request(
      new Request("http://local/employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: "Uno",
          email: "dup@t.local",
        }),
      }),
    );
    const again = await handle_request(
      new Request("http://local/employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: "Dos",
          email: "dup@t.local",
        }),
      }),
    );
    expect(again.status).toBe(409);
  });
});

// (o-----------------------------------------------------------/\-----o)
//   #endregion EMPLOYEES TESTS
// (o==================================================================o)
