// (o==================================================================o)
//   #region AUTH
// (o-----------------------------------------------------------\/-----o)

import {
  verify_kirlet_identity,
  kirlet_identity_can,
  type KirletIdentity,
} from "@opus-perpetuus/kirel-nox-kit";
import {
  is_auth_disabled,
  get_gateway_secret,
  get_technical_id,
} from "./config.ts";
import { error } from "./http.ts";

export type AuthAction = "create" | "read" | "update" | "delete";

/** Meta paths that never require a signed identity. */
export function is_meta_path(path: string): boolean {
  if (path === "/" || path === "") return true;
  if (path === "/health") return true;
  if (path === "/manifest") return true;
  if (path === "/menu") return true;
  if (path === "/pages") return true;
  if (path.startsWith("/pages/")) return true;
  return false;
}

/**
 * History is JWT+signed-identity protected but not tied to a single module
 * grant — any kirlet.hr.<module> read (or admin) may list history.
 */
export function can_read_history(identity: KirletIdentity | null): boolean {
  if (is_auth_disabled()) return true;
  if (!identity) return false;
  if (identity.is_admin) return true;
  return identity.grants.some(
    (g) =>
      g.r === true &&
      (g.resource === "kirlet.hr.*" ||
        g.resource.startsWith("kirlet.hr.")),
  );
}

function dev_identity(): KirletIdentity {
  return {
    user_id: "dev",
    email: "dev@local",
    is_admin: true,
    kirlet_id: get_technical_id(),
    grants: [],
  };
}

let auth_off_warned = false;

/**
 * Resolve identity for a request.
 * Meta paths: optional identity (null ok).
 * Non-meta: requires valid signature unless KIRLET_AUTH=off.
 */
export function resolve_identity(
  req: Request,
  path: string,
): { ok: true; identity: KirletIdentity | null } | { ok: false; response: Response } {
  const secret = get_gateway_secret();

  if (is_meta_path(path)) {
    if (!secret) {
      return { ok: true, identity: null };
    }
    const headers = headers_to_record(req);
    const verified = verify_kirlet_identity(headers, secret);
    return { ok: true, identity: verified.ok ? verified.identity : null };
  }

  if (is_auth_disabled()) {
    if (!auth_off_warned) {
      console.warn(
        "[kirlet-hr] KIRLET_AUTH=off — identity signature checks disabled (standalone dev)",
      );
      auth_off_warned = true;
    }
    return { ok: true, identity: dev_identity() };
  }

  if (!secret) {
    return {
      ok: false,
      response: error(
        "auth_misconfigured",
        "NOX_KIRLET_GATEWAY_SECRET is required when KIRLET_AUTH is on",
        500,
      ),
    };
  }

  const verified = verify_kirlet_identity(headers_to_record(req), secret);
  if (!verified.ok) {
    return {
      ok: false,
      response: error("unauthorized", verified.error, 401),
    };
  }
  return { ok: true, identity: verified.identity };
}

export function require_access(
  identity: KirletIdentity | null,
  module: string,
  action: AuthAction,
): Response | null {
  if (is_auth_disabled()) return null;
  if (!identity) {
    return error("unauthorized", "missing identity", 401);
  }
  const resource = `kirlet.hr.${module}`;
  if (!kirlet_identity_can(identity, resource, action)) {
    return error(
      "forbidden",
      `missing grant ${resource} ${action}`,
      403,
    );
  }
  return null;
}

export function actor_from(identity: KirletIdentity | null): string | null {
  return identity?.email ?? null;
}

function headers_to_record(
  req: Request,
): Record<string, string | null | undefined> {
  const out: Record<string, string | null | undefined> = {};
  req.headers.forEach((v, k) => {
    out[k] = v;
    out[k.toLowerCase()] = v;
  });
  return out;
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion AUTH
// (o==================================================================o)
