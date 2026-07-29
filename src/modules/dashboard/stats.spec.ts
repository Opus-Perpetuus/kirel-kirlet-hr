import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { close_db, init_db, get_db } from "../../db.ts";
import { seed_leave_types, seed_demo } from "../../seed.ts";
import { compute_dashboard_stats } from "./stats.ts";
import { handle_request } from "../../server.ts";

describe("dashboard stats (shipped)", () => {
  let data_dir: string;

  beforeAll(() => {
    data_dir = mkdtempSync(join(tmpdir(), "kirlet-hr-dash-"));
    process.env.DATA_DIR = data_dir;
    process.env.KIRLET_AUTH = "off";
    process.env.KIRLET_SEED_DEMO = "1";
    init_db(join(data_dir, "hr.db"));
    seed_leave_types();
    seed_demo();
  });

  afterAll(() => {
    close_db();
    rmSync(data_dir, { recursive: true, force: true });
  });

  test("compute_dashboard_stats reflects real DB counts after seed", () => {
    const s = compute_dashboard_stats(get_db());
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
