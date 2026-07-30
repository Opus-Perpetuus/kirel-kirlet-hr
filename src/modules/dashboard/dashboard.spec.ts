import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  create_kirlet_test_context,
  type KirletServer,
} from "@opus-perpetuus/kirel-nox-kit";
import { KIRLET } from "../../kirlet.ts";
import { seed_demo } from "../../seed.ts";
import { compute_dashboard_stats } from "./dashboard.service.ts";
import { dashboard_pages } from "./dashboard.pages.ts";

describe("dashboard", () => {
  let server: KirletServer;

  beforeEach(async () => {
    server = create_kirlet_test_context(KIRLET);
    await seed_demo({
      data: server.data,
      nox: server.nox,
      technical_id: KIRLET.technical_id,
    });
  });

  afterEach(() => {
    server.stop();
  });

  test("compute_dashboard_stats reflects real counts after seed", async () => {
    const s = await compute_dashboard_stats(server.data);
    expect(s.empleados_activos).toBeGreaterThanOrEqual(2);
    expect(s.solicitudes_pendientes).toBeGreaterThanOrEqual(1);
    expect(s.contratos_por_vencer_30d).toBeGreaterThanOrEqual(1);
  });

  test("GET /dashboard/stats returns numeric metrics", async () => {
    const res = await server.fetch(
      new Request("http://t/dashboard/stats"),
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

  test("dashboard page binds nox.stats to live source", () => {
    const page = dashboard_pages[0]!.build({ url: null, identity: null });
    const json = JSON.stringify(page);
    expect(json).toContain("nox.stats");
    expect(json).toContain("/dashboard/stats");
    expect(json).toContain("empleados_activos");
    expect(json).toContain("refreshIntervalMs");
  });
});
