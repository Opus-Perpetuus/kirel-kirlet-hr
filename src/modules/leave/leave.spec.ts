import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  create_kirlet_test_context,
  new_id,
  now_iso,
  today_iso,
  type KirletServer,
} from "@opus-perpetuus/kirel-nox-kit";
import { KIRLET } from "../../kirlet.ts";
import { seed_leave_types } from "../../seed.ts";

describe("leave", () => {
  let server: KirletServer;
  let employee_id: string;
  let leave_type_id: string;

  beforeEach(async () => {
    server = create_kirlet_test_context(KIRLET);
    await seed_leave_types(server.data);

    const iso = now_iso();
    employee_id = new_id("emp");
    await server.data.insert("employees", {
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
      active: true,
      created_at: iso,
      updated_at: iso,
    });

    const vac = await server.data.findOne("leave_types", {
      name: "vacaciones",
    });
    leave_type_id = String(vac!.id);

    const year = new Date().getFullYear();
    await server.data.insert("leave_balances", {
      id: new_id("lb"),
      employee_id,
      leave_type_id,
      year,
      entitled_days: 12,
      used_days: 0,
    });
  });

  afterEach(() => {
    server.stop();
  });

  test("approve deducts used_days", async () => {
    const create = await server.fetch(
      new Request("http://t/leave-requests", {
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

    const approve = await server.fetch(
      new Request(`http://t/leave-requests/${data.id}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision_note: "ok" }),
      }),
    );
    expect(approve.status).toBe(200);
    const approved = (await approve.json()) as { data: { status: string } };
    expect(approved.data.status).toBe("aprobada");

    const year = 2026;
    const bal = await server.data.findOne("leave_balances", {
      employee_id,
      leave_type_id,
      year,
    });
    expect(bal).toBeTruthy();
    expect(Number(bal!.used_days)).toBe(3);
  });

  test("reject invalid transitions", async () => {
    const create = await server.fetch(
      new Request("http://t/leave-requests", {
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

    await server.fetch(
      new Request(`http://t/leave-requests/${data.id}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    const again = await server.fetch(
      new Request(`http://t/leave-requests/${data.id}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(again.status).toBe(409);

    const cancel_again = await server.fetch(
      new Request(`http://t/leave-requests/${data.id}/cancel`, {
        method: "POST",
      }),
    );
    expect(cancel_again.status).toBe(409);
  });
});
