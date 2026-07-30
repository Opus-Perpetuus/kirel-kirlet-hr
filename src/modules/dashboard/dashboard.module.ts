// (o==================================================================o)
//   #region DASHBOARD MODULE (class + kit repository)
// (o-----------------------------------------------------------\/-----o)

import {
  KirletModule,
  type KirletDataClient,
  type KirletRouteContext,
  type NoxPageDescriptor,
} from "@opus-perpetuus/kirel-nox-kit";
import { json, method_not_allowed } from "../../http.ts";
import { require_access } from "../../auth.ts";
import { compute_dashboard_stats, stats_as_rows } from "./stats.ts";
import { build_dashboard_page } from "./descriptors.ts";

export class DashboardModule extends KirletModule {
  constructor(data: KirletDataClient) {
    super(data);
  }

  pages() {
    return [
      {
        id: "hr.dashboard",
        path: "dashboard",
        permission: "kirlet.hr.dashboard.read",
        build: build_dashboard_page as () => NoxPageDescriptor,
      },
    ];
  }

  override async handle(ctx: KirletRouteContext): Promise<Response | null> {
    const { req, path, identity } = ctx;
    if (path === "/dashboard/stats" || path === "/dashboard") {
      if (req.method !== "GET") return method_not_allowed(["GET"]);
      const denied = require_access(identity, "dashboard", "read");
      if (denied) return denied;
      const data = await compute_dashboard_stats(this.data);
      return json({
        data,
        rows: stats_as_rows(data),
      });
    }
    return null;
  }
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DASHBOARD MODULE
// (o==================================================================o)
