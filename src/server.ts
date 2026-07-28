// (o==================================================================o)
//   #region KIRLET-HR SERVER
// (o-----------------------------------------------------------\/-----o)

/**
 * KIRLET-hr — modular Bun server + bun:sqlite under DATA_DIR.
 * Signed identity auth, full HR modules, feature-shell descriptors, manifest v1.
 */

import {
  get_port,
  get_technical_id,
  get_data_dir,
  get_db_path,
  get_seed_demo,
  is_auth_disabled,
} from "./config.ts";
import { init_db } from "./db.ts";
import { json, not_found, error } from "./http.ts";
import { resolve_identity } from "./auth.ts";
import { build_hr_menu } from "./menu.ts";
import {
  dispatch_module,
  get_page,
  list_page_index,
} from "./modules/registry.ts";
import { seed_leave_types, seed_demo } from "./seed.ts";
import { list_history } from "./history.ts";
import { require_access } from "./auth.ts";
import { join } from "node:path";

// (o==================================================================o)
//   #region REQUEST HANDLER
// (o-----------------------------------------------------------\/-----o)

export async function handle_request(req: Request): Promise<Response> {
  const started = performance.now();
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  let status = 500;

  try {
    const auth = resolve_identity(req, path);
    if (!auth.ok) {
      status = auth.response.status;
      return auth.response;
    }
    const identity = auth.identity;

    // Meta
    if (path === "/health") {
      status = 200;
      return json({
        status: "ok",
        service: get_technical_id(),
        ready: true,
        time: new Date().toISOString(),
      });
    }

    if (path === "/manifest") {
      status = 200;
      const file = Bun.file(join(import.meta.dir, "..", "manifest.json"));
      return new Response(file, {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    if (path === "/menu") {
      status = 200;
      return json({ data: build_hr_menu() });
    }

    if (path === "/pages") {
      status = 200;
      return json({ data: list_page_index() });
    }

    if (path.startsWith("/pages/")) {
      const id = path.slice("/pages/".length);
      const page = get_page(id);
      if (!page) {
        status = 404;
        return not_found(path);
      }
      status = 200;
      return json(page);
    }

    if (path === "/" || path === "") {
      status = 200;
      return json({
        service: get_technical_id(),
        message:
          "KIRLET-hr — /health, /manifest, /menu, /pages, módulos RR.HH.",
        menu: build_hr_menu(),
        auth: is_auth_disabled() ? "off" : "on",
      });
    }

    // History (cross-module)
    if (path === "/history" && req.method === "GET") {
      const denied = require_access(identity, "employees", "read");
      // Allow history with any module read via employees as default, or skip when auth off
      if (denied) {
        status = denied.status;
        return denied;
      }
      const result = list_history({
        resource: url.searchParams.get("resource") ?? undefined,
        record_id: url.searchParams.get("record_id") ?? undefined,
        take: Number(url.searchParams.get("take") ?? 100) || 100,
        skip: Number(url.searchParams.get("skip") ?? 0) || 0,
      });
      status = 200;
      return json(result);
    }

    const module_res = await dispatch_module(req, path, url, identity);
    if (module_res) {
      status = module_res.status;
      return module_res;
    }

    status = 404;
    return not_found(path);
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "unhandled",
        error: err instanceof Error ? err.message : String(err),
        path,
        method: req.method,
      }),
    );
    status = 500;
    return error(
      "internal_error",
      err instanceof Error ? err.message : String(err),
      500,
    );
  } finally {
    const ms = Math.round(performance.now() - started);
    console.log(
      JSON.stringify({
        level: "info",
        msg: "request",
        method: req.method,
        path,
        status,
        ms,
        actor: null,
      }),
    );
  }
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion REQUEST HANDLER
// (o==================================================================o)

// (o==================================================================o)
//   #region BOOT
// (o-----------------------------------------------------------\/-----o)

export function boot(opts?: { db_path?: string; listen?: boolean }) {
  const db_path = opts?.db_path ?? get_db_path();
  init_db(db_path);
  seed_leave_types();
  if (get_seed_demo()) {
    const demo = seed_demo();
    if (demo.employees > 0) {
      console.log(
        JSON.stringify({
          level: "info",
          msg: "seed_demo",
          ...demo,
        }),
      );
    }
  }

  if (opts?.listen === false) return null;

  const server = Bun.serve({
    port: get_port(),
    fetch: handle_request,
    error(err) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "serve_error",
          error: err.message,
        }),
      );
      return error("internal_error", err.message, 500);
    },
  });

  console.log(
    JSON.stringify({
      level: "info",
      msg: "listening",
      service: get_technical_id(),
      port: server.port,
      data_dir: get_data_dir(),
      auth: is_auth_disabled() ? "off" : "on",
    }),
  );
  return server;
}

if (import.meta.main) {
  boot();
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion BOOT
// (o==================================================================o)

// (o-----------------------------------------------------------/\-----o)
//   #endregion KIRLET-HR SERVER
// (o==================================================================o)
