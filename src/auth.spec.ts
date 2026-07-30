// (o==================================================================o)
//   #region AUTH TESTS
// (o-----------------------------------------------------------\/-----o)

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  sign_kirlet_identity,
  type KirletIdentity,
} from "@opus-perpetuus/kirel-nox-kit";
import { reset_hr_app_for_tests, close_hr_app } from "./app/hr-app.ts";
import { seed_leave_types } from "./seed.ts";
import { handle_request } from "./server.ts";
import { can_read_history, is_meta_path } from "./auth.ts";

const SECRET = "test-gateway-secret-hr-auth";

function signed_headers(
  identity: Partial<KirletIdentity> & Pick<KirletIdentity, "user_id" | "email">,
): Record<string, string> {
  const full: KirletIdentity = {
    user_id: identity.user_id,
    email: identity.email,
    is_admin: identity.is_admin ?? false,
    kirlet_id: identity.kirlet_id ?? "kirlet-hr",
    grants: identity.grants ?? [],
  };
  return sign_kirlet_identity(full, SECRET);
}

describe("auth", () => {
  let data_dir: string;

  beforeAll(async () => {
    data_dir = mkdtempSync(join(tmpdir(), "kirlet-hr-auth-"));
    process.env.DATA_DIR = data_dir;
    process.env.NOX_KIRLET_GATEWAY_SECRET = SECRET;
    process.env.KIRLET_AUTH = "on";
    process.env.KIRLET_SEED_DEMO = "0";
    reset_hr_app_for_tests();
    await seed_leave_types();
  });

  afterAll(() => {
    close_hr_app();
    rmSync(data_dir, { recursive: true, force: true });
    delete process.env.NOX_KIRLET_GATEWAY_SECRET;
    process.env.KIRLET_AUTH = "off";
  });

  test("meta paths are recognized", () => {
    expect(is_meta_path("/")).toBe(true);
    expect(is_meta_path("/health")).toBe(true);
    expect(is_meta_path("/manifest")).toBe(true);
    expect(is_meta_path("/schema")).toBe(true);
    expect(is_meta_path("/menu")).toBe(true);
    expect(is_meta_path("/pages")).toBe(true);
    expect(is_meta_path("/pages/hr.employees")).toBe(true);
    expect(is_meta_path("/employees")).toBe(false);
  });

  test("can_read_history allows any kirlet.hr.* read grant", () => {
    expect(
      can_read_history({
        user_id: "u",
        email: "a@b.c",
        is_admin: false,
        kirlet_id: "kirlet-hr",
        grants: [
          {
            resource: "kirlet.hr.leave",
            c: false,
            r: true,
            u: false,
            d: false,
          },
        ],
      }),
    ).toBe(true);
    expect(
      can_read_history({
        user_id: "u",
        email: "a@b.c",
        is_admin: false,
        kirlet_id: "kirlet-hr",
        grants: [],
      }),
    ).toBe(false);
  });

  test("reject unsigned non-meta", async () => {
    const res = await handle_request(
      new Request("http://local/employees"),
    );
    expect(res.status).toBe(401);
  });

  test("allow meta without signature", async () => {
    const health = await handle_request(
      new Request("http://local/health"),
    );
    expect(health.status).toBe(200);

    const menu = await handle_request(new Request("http://local/menu"));
    expect(menu.status).toBe(200);

    const pages = await handle_request(new Request("http://local/pages"));
    expect(pages.status).toBe(200);

    const schema = await handle_request(new Request("http://local/schema"));
    expect(schema.status).toBe(200);
  });

  test("respect grants — read ok, write forbidden", async () => {
    const headers = signed_headers({
      user_id: "u1",
      email: "reader@test.local",
      is_admin: false,
      grants: [
        { resource: "kirlet.hr.employees", c: false, r: true, u: false, d: false },
      ],
    });

    const list = await handle_request(
      new Request("http://local/employees", { headers }),
    );
    expect(list.status).toBe(200);

    const create = await handle_request(
      new Request("http://local/employees", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          full_name: "No Write",
          email: "nowrite@test.local",
        }),
      }),
    );
    expect(create.status).toBe(403);
  });

  test("admin bypasses grants", async () => {
    const headers = signed_headers({
      user_id: "admin",
      email: "admin@test.local",
      is_admin: true,
      grants: [],
    });
    const list = await handle_request(
      new Request("http://local/employees", { headers }),
    );
    expect(list.status).toBe(200);
  });
});

// (o-----------------------------------------------------------/\-----o)
//   #endregion AUTH TESTS
// (o==================================================================o)
