// (o==================================================================o)
//   #region LEAVE TESTS
// (o-----------------------------------------------------------\/-----o)

import { describe, expect, test, beforeAll, afterAll, beforeEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { close_db, init_db, get_db } from "../../db.ts";
import { seed_leave_types } from "../../seed.ts";
import { handle_request } from "../../server.ts";
import { new_id, now_iso, today_iso } from "../../http.ts";

describe("leave", () => {
  let data_dir: string;
  let employee_id: string;
  let leave_type_id: string;

  beforeAll(() => {
    data_dir = mkdtempSync(join(tmpdir(), "kirlet-hr-leave-"));
    process.env.DATA_DIR = data_dir;
    process.env.KIRLET_AUTH = "off";
    process.env.KIRLET_SEED_DEMO = "0";
    init_db(join(data_dir, "hr.db"));
    seed_leave_types();

    const db = get_db();
    const iso = now_iso();
    employee_id = new_id("emp");
    db.query(
      `INSERT INTO employees (
        id, name, full_name, email, department_id, position_id, manager_id,
        hired_at, phone, rfc, curp, nss, is_active, created_at, updated_at
      ) VALUES (?, 'Test', 'Test User', 'leave@t.local', NULL, NULL, NULL, ?, NULL, NULL, NULL, NULL, 1, ?, ?)`,
    ).run(employee_id, today_iso(), iso, iso);

    const vac = db
      .query(`SELECT id FROM leave_types WHERE name = 'vacaciones'`)
      .get() as { id: string };
    leave_type_id = vac.id;

    const year = new Date().getFullYear();
    db.query(
      `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, entitled_days, used_days)
       VALUES (?, ?, ?, ?, 12, 0)`,
    ).run(new_id("lb"), employee_id, leave_type_id, year);
  });

  afterAll(() => {
    close_db();
    rmSync(data_dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    get_db().exec(`DELETE FROM leave_requests`);
    get_db()
      .query(
        `UPDATE leave_balances SET used_days = 0 WHERE employee_id = ?`,
      )
      .run(employee_id);
  });

  test("approve deducts used_days", async () => {
    const create = await handle_request(
      new Request("http://local/leave-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          employee_id,
          leave_type_id,
          start_date: "2026-03-01",
          end_date: "2026-03-03",
          days: 3,
        }),
      }),
    );
    expect(create.status).toBe(201);
    const { data } = (await create.json()) as { data: { id: string } };

    const approve = await handle_request(
      new Request(`http://local/leave-requests/${data.id}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision_note: "ok" }),
      }),
    );
    expect(approve.status).toBe(200);
    const approved = (await approve.json()) as { data: { status: string } };
    expect(approved.data.status).toBe("aprobada");

    const year = 2026;
    const bal = get_db()
      .query(
        `SELECT used_days FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
      )
      .get(employee_id, leave_type_id, year) as { used_days: number };
    expect(bal.used_days).toBe(3);
  });

  test("reject invalid transitions", async () => {
    const create = await handle_request(
      new Request("http://local/leave-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          employee_id,
          leave_type_id,
          start_date: "2026-04-01",
          end_date: "2026-04-02",
          days: 2,
        }),
      }),
    );
    const { data } = (await create.json()) as { data: { id: string } };

    await handle_request(
      new Request(`http://local/leave-requests/${data.id}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    const again = await handle_request(
      new Request(`http://local/leave-requests/${data.id}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(again.status).toBe(409);

    const cancel_again = await handle_request(
      new Request(`http://local/leave-requests/${data.id}/cancel`, {
        method: "POST",
      }),
    );
    expect(cancel_again.status).toBe(409);
  });
});

// (o-----------------------------------------------------------/\-----o)
//   #endregion LEAVE TESTS
// (o==================================================================o)
