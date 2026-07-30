import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  reset_hr_app_for_tests,
  close_hr_app,
  get_data,
} from "../../app/hr-app.ts";
import { seed_leave_types, seed_demo } from "../../seed.ts";
import { compute_dashboard_stats } from "./stats.ts";
import { handle_request } from "../../server.ts";

describe("dashboard stats (shipped)", () => {
  let data_dir: string;

  beforeAll(async () => {
    data_dir = mkdtempSync(join(tmpdir(), "kirlet-hr-dash-"));
    process.env.DATA_DIR = data_dir;
    process.env.KIRLET_AUTH = "off";
    process.env.KIRLET_SEED_DEMO = "1";
    reset_hr_app_for_tests();
    await seed_leave_types();
    await seed_demo();
  });

  afterAll(() => {
    close_hr_app();
    rmSync(data_dir, { recursive: true, force: true });
  });

  test("compute_dashboard_stats reflects real counts after seed", async () => {
    const s = await compute_dashboard_stats(get_data());
    expect(s.empleados_activos).toBeGreaterThanOrEqual(2);
    expect(s.solicitudes_pendientes).toBeGreaterThanOrEqual(1);
    expect(s.contratos_por_vencer_30d).toBeGreaterThanOrEqual(1);
  });

  test("GET /dashboard/stats returns numeric metrics from real handler", async () => {
    const res = await handle_request(
      new Request("http://local/dashboard/stats"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        empleados_activos: number;
        solicitudes_pendientes: number;
        contratos_por_vencer_30d: number;
      };
    };
    expect(body.data.empleados_activos).toBeGreaterThanOrEqual(2);
    expect(body.data.solicitudes_pendientes).toBeGreaterThanOrEqual(1);
    expect(body.data.contratos_por_vencer_30d).toBeGreaterThanOrEqual(1);
  });
});
