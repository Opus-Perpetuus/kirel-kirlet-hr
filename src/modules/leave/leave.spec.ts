// (o==================================================================o)
//   #region LEAVE TESTS
// (o-----------------------------------------------------------\/-----o)

import {
  describe,
  expect,
  test,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
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

describe("leave", () => {
  let data_dir: string;
  let employee_id: string;
  let leave_type_id: string;

  beforeAll(async () => {
    data_dir = mkdtempSync(join(tmpdir(), "kirlet-hr-leave-"));
    process.env.DATA_DIR = data_dir;
    process.env.KIRLET_AUTH = "off";
    process.env.KIRLET_SEED_DEMO = "0";
    reset_hr_app_for_tests();
    await seed_leave_types();

    const data = get_data();
    const employees = new KirletRepository(data, "employees");
    const leave_types = new KirletRepository(data, "leave_types");
    const leave_balances = new KirletRepository(data, "leave_balances");
    const iso = now_iso();
    employee_id = new_id("emp");
    await employees.insert({
      id: employee_id,
      name: "Test",
      full_name: "Test User",
      email: "leave@t.local",
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

    const vac = await leave_types.findOne({ name: "vacaciones" });
    leave_type_id = String(vac!.id);

    const year = new Date().getFullYear();
    await leave_balances.insert({
      id: new_id("lb"),
      employee_id,
      leave_type_id,
      year,
      entitled_days: 12,
      used_days: 0,
    });
  });

  afterAll(() => {
    close_hr_app();
    rmSync(data_dir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    const data = get_data();
    const requests = new KirletRepository(data, "leave_requests");
    const balances = new KirletRepository(data, "leave_balances");
    const rows = await requests.findMany({ limit: 10000 });
    for (const r of rows) await requests.deleteById(r.id as string);
    const bals = await balances.findMany({ where: { employee_id } });
    for (const b of bals) {
      await balances.updateById(b.id as string, { used_days: 0 });
    }
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
    const bal = await new KirletRepository(get_data(), "leave_balances").findOne(
      {
        employee_id,
        leave_type_id,
        year,
      },
    );
    // ensure_balance may create 2026 balance from leave type max; if entitled
    // was only seeded for current year, ensure_balance creates for 2026.
    // The approve path uses start_date year (2026).
    expect(bal).toBeTruthy();
    expect(Number(bal!.used_days)).toBe(3);
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
