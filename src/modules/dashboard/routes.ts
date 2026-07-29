// (o==================================================================o)
//   #region DASHBOARD ROUTES
// (o-----------------------------------------------------------\/-----o)

import type { KirletIdentity } from "@opus-perpetuus/kirel-nox-kit";
import { get_db } from "../../db.ts";
import { json, method_not_allowed } from "../../http.ts";
import { require_access } from "../../auth.ts";
import { compute_dashboard_stats, stats_as_rows } from "./stats.ts";

export async function handle_dashboard(
  req: Request,
  path: string,
  _url: URL,
  identity: KirletIdentity | null,
): Promise<Response | null> {
  if (path === "/dashboard/stats" || path === "/dashboard") {
    if (req.method !== "GET") return method_not_allowed(["GET"]);
    const denied = require_access(identity, "dashboard", "read");
    if (denied) return denied;
    return stats();
  }
  return null;
}

function stats(): Response {
  const data = compute_dashboard_stats(get_db());
  return json({
    data,
    // Convenience for table binding
    rows: stats_as_rows(data),
  });
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DASHBOARD ROUTES
// (o==================================================================o)
