// (o==================================================================o)
//   #region INCIDENTS TESTS
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
import { handle_request } from "../../server.ts";
import { new_id, now_iso, today_iso } from "../../http.ts";
import {
  can_transition_incident_status,
  normalize_incident_input,
} from "./schema.ts";

describe("incidents (shipped)", () => {
  let data_dir: string;
  let employee_id: string;

  beforeAll(async () => {
    data_dir = mkdtempSync(join(tmpdir(), "kirlet-hr-inc-"));
    process.env.DATA_DIR = data_dir;
    process.env.KIRLET_AUTH = "off";
    process.env.KIRLET_SEED_DEMO = "0";
    reset_hr_app_for_tests();

    const employees = new KirletRepository(get_data(), "employees");
    const iso = now_iso();
    employee_id = new_id("emp");
    await employees.insert({
      id: employee_id,
      name: "Ada",
      full_name: "Ada Lovelace",
      email: "ada-inc@t.local",
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

  beforeEach(async () => {
    const incidents = new KirletRepository(get_data(), "incidents");
    const rows = await incidents.findMany({ limit: 10000 });
    for (const r of rows) await incidents.deleteById(r.id as string);
  });

  test("normalize requires title and validates type/severity/status", () => {
    expect(() => normalize_incident_input({})).toThrow(/title/);
    expect(() =>
      normalize_incident_input({ title: "X", type: "nope" }),
    ).toThrow(/type/);
    const ok = normalize_incident_input({
      title: "Caída en piso",
      type: "accidente",
      severity: "alta",
      employee_id,
    });
    expect(ok.title).toBe("Caída en piso");
    expect(ok.type).toBe("accidente");
    expect(ok.severity).toBe("alta");
  });

  test("status transitions enforce workflow", () => {
    expect(can_transition_incident_status("abierta", "en_proceso")).toBe(true);
    expect(can_transition_incident_status("abierta", "cerrada")).toBe(false);
    expect(can_transition_incident_status("resuelta", "cerrada")).toBe(true);
    expect(can_transition_incident_status("cerrada", "abierta")).toBe(false);
  });

  test("create/list/read/update round-trips with employee link", async () => {
    const create = await handle_request(
      new Request("http://local/incidents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Fuga de aceite",
          type: "seguridad",
          severity: "media",
          employee_id,
          location: "Planta A",
          description: "Charco en pasillo 3",
        }),
      }),
    );
    expect(create.status).toBe(201);
    const created = (await create.json()) as {
      data: {
        id: string;
        folio: string;
        title: string;
        employee_id: string | null;
        status: string;
      };
    };
    expect(created.data.title).toBe("Fuga de aceite");
    expect(created.data.employee_id).toBe(employee_id);
    expect(created.data.status).toBe("abierta");
    expect(created.data.folio).toMatch(/^INC-\d{4}-\d{4}$/);

    const list = await handle_request(
      new Request("http://local/incidents?q=aceite"),
    );
    expect(list.status).toBe(200);
    const listed = (await list.json()) as {
      data: Array<{ id: string }>;
      total: number;
    };
    expect(listed.total).toBeGreaterThanOrEqual(1);
    expect(listed.data.some((r) => r.id === created.data.id)).toBe(true);

    const get = await handle_request(
      new Request(`http://local/incidents/${created.data.id}`),
    );
    expect(get.status).toBe(200);
    const got = (await get.json()) as {
      data: { title: string; employee_id: string | null };
    };
    expect(got.data.employee_id).toBe(employee_id);

    const patch = await handle_request(
      new Request(`http://local/incidents/${created.data.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ severity: "alta", assigned_to: "seguridad" }),
      }),
    );
    expect(patch.status).toBe(200);
    const patched = (await patch.json()) as {
      data: { severity: string; assigned_to: string | null };
    };
    expect(patched.data.severity).toBe("alta");
    expect(patched.data.assigned_to).toBe("seguridad");
  });

  test("invalid employee_id is rejected", async () => {
    const res = await handle_request(
      new Request("http://local/incidents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Sin empleado",
          employee_id: "emp_no_existe",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  test("workflow actions review → start → resolve → close", async () => {
    const create = await handle_request(
      new Request("http://local/incidents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Queja de horario",
          type: "queja",
          severity: "baja",
        }),
      }),
    );
    const { data } = (await create.json()) as { data: { id: string } };

    const review = await handle_request(
      new Request(`http://local/incidents/${data.id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );
    expect(review.status).toBe(200);
    expect(
      ((await review.json()) as { data: { status: string } }).data.status,
    ).toBe("en_revision");

    const start = await handle_request(
      new Request(`http://local/incidents/${data.id}/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );
    expect(start.status).toBe(200);

    const resolve = await handle_request(
      new Request(`http://local/incidents/${data.id}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resolution_note: "Ajuste de turno" }),
      }),
    );
    expect(resolve.status).toBe(200);
    const resolved = (await resolve.json()) as {
      data: { status: string; resolution_note: string | null };
    };
    expect(resolved.data.status).toBe("resuelta");
    expect(resolved.data.resolution_note).toContain("Ajuste");

    const close = await handle_request(
      new Request(`http://local/incidents/${data.id}/close`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );
    expect(close.status).toBe(200);
    const closed = (await close.json()) as {
      data: { status: string; closed_at: string | null };
    };
    expect(closed.data.status).toBe("cerrada");
    expect(closed.data.closed_at).toBeTruthy();
  });

  test("illegal transition is rejected", async () => {
    const create = await handle_request(
      new Request("http://local/incidents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "X", type: "otro" }),
      }),
    );
    const { data } = (await create.json()) as { data: { id: string } };
    const close = await handle_request(
      new Request(`http://local/incidents/${data.id}/close`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );
    expect(close.status).toBe(400);
  });

  test("soft-delete hides from default list", async () => {
    const create = await handle_request(
      new Request("http://local/incidents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Temporal", type: "otro" }),
      }),
    );
    const { data } = (await create.json()) as { data: { id: string } };
    const del = await handle_request(
      new Request(`http://local/incidents/${data.id}`, { method: "DELETE" }),
    );
    expect(del.status).toBe(200);
    const list = await handle_request(new Request("http://local/incidents"));
    const body = (await list.json()) as { data: Array<{ id: string }> };
    expect(body.data.some((r) => r.id === data.id)).toBe(false);
  });
});

// (o-----------------------------------------------------------/\-----o)
//   #endregion INCIDENTS TESTS
// (o==================================================================o)
