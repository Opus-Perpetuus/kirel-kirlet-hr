import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { build_dashboard_page } from "./descriptors.ts";

// (o==================================================================o)
//   #region PANEL REFRESH STRUCTURAL
// (o-----------------------------------------------------------\/-----o)

describe("HR panel live stats binding", () => {
  test("dashboard descriptor binds nox.stats to live source with refresh", () => {
    const page = build_dashboard_page();
    const json = JSON.stringify(page);
    expect(json).toContain("nox.stats");
    expect(json).toContain("/dashboard/stats");
    expect(json).toContain("empleados_activos");
    expect(json).toContain("refreshIntervalMs");
  });

  test("NOX stats host passes source + refreshIntervalMs (structural)", () => {
    const host = readFileSync(
      join(
        import.meta.dir,
        "../../../../kirel-nox/apps/ui/src/app/features/descriptor/descriptor-host.component.html",
      ),
      "utf8",
    );
    expect(host).toContain("stats_source()");
    expect(host).toContain("stats_refresh_ms()");
    const stats_ts = readFileSync(
      join(
        import.meta.dir,
        "../../../../kirel-nox/apps/ui/src/app/kirita/feedback/stats/stats.component.ts",
      ),
      "utf8",
    );
    expect(stats_ts).toContain("refreshIntervalMs");
    expect(stats_ts).toContain("setInterval");
    expect(stats_ts).toContain("resolve_stats_items");
  });
});

// (o-----------------------------------------------------------/\-----o)
//   #endregion PANEL REFRESH STRUCTURAL
// (o==================================================================o)
