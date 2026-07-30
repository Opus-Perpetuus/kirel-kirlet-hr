// (o==================================================================o)
//   #region KIRLET-HR SERVER
// (o-----------------------------------------------------------\/-----o)

/**
 * KIRLET-hr — modular Bun server using kit data client (shared NOX Postgres
 * in production; Memory store in tests / standalone). No private domain DB.
 */

import {
  get_port,
  get_technical_id,
  get_data_dir,
  get_seed_demo,
  is_auth_disabled,
} from "./config.ts";
import { json, not_found, error } from "./http.ts";
import { can_read_history, resolve_identity } from "./auth.ts";
import { build_hr_menu } from "./menu.ts";
import {
  get_hr_app,
  init_hr_app,
  close_hr_app,
  HR_SCHEMA,
} from "./app/hr-app.ts";
import { seed_leave_types, seed_demo } from "./seed.ts";
import { list_history } from "./history.ts";
import { join } from "node:path";

// (o==================================================================o)
//   #region REQUEST HANDLER
// (o-----------------------------------------------------------\/-----o)

export async function handle_request(req: Request): Promise<Response> {
  const started = performance.now();
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  let status = 500;
  let actor: string | null = null;

  try {
    const auth = resolve_identity(req, path);
    if (!auth.ok) {
      status = auth.response.status;
      return auth.response;
    }
    const identity = auth.identity;
    actor = identity?.email ?? null;

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

    if (path === "/schema") {
      status = 200;
      return json(HR_SCHEMA);
    }

    if (path === "/menu") {
      status = 200;
      return json({ data: build_hr_menu() });
    }

    const app = get_hr_app();

    if (path === "/pages") {
      status = 200;
      return json({
        data: app.list_pages().map(({ id, path: p, permission }) => ({
          id,
          path: p,
          permission,
        })),
      });
    }

    if (path.startsWith("/pages/")) {
      const id = path.slice("/pages/".length);
      const page = app.get_page(id);
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
          "KIRLET-hr — /health, /manifest, /schema, /menu, /pages, módulos RR.HH.",
        menu: build_hr_menu(),
        auth: is_auth_disabled() ? "off" : "on",
      });
    }

    // History (cross-module) — signed identity required; any module read grant
    if (path === "/history" && req.method === "GET") {
      if (!can_read_history(identity)) {
        status = 403;
        return error("forbidden", "missing grant to read history", 403);
      }
      const result = await list_history({
        resource: url.searchParams.get("resource") ?? undefined,
        record_id: url.searchParams.get("record_id") ?? undefined,
        take: Number(url.searchParams.get("take") ?? 100) || 100,
        skip: Number(url.searchParams.get("skip") ?? 0) || 0,
      });
      status = 200;
      return json(result);
    }

    const module_res = await app.dispatch({ req, path, url, identity });
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
        actor,
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

export async function boot(opts?: { listen?: boolean }) {
  init_hr_app();
  await seed_leave_types();
  if (get_seed_demo()) {
    const demo = await seed_demo();
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
      storage: "shared-nox-postgres",
    }),
  );
  return server;
}

if (import.meta.main) {
  await boot();
}

export { close_hr_app, init_hr_app };

// (o-----------------------------------------------------------/\-----o)
//   #endregion BOOT
// (o==================================================================o)

// (o-----------------------------------------------------------/\-----o)
//   #endregion KIRLET-HR SERVER
// (o==================================================================o)
