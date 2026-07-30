import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  create_kirlet_test_context,
  type KirletServer,
} from "@opus-perpetuus/kirel-nox-kit";
import { KIRLET } from "../../kirlet.ts";
import { normalize_employee_input } from "./employees.controller.ts";

describe("employees", () => {
  let server: KirletServer;

  beforeEach(() => {
    server = create_kirlet_test_context(KIRLET);
  });

  afterEach(() => {
    server.stop();
  });

  test("normalize requires full_name/email", () => {
    expect(() => normalize_employee_input({})).toThrow(/full_name/);
    const ok = normalize_employee_input({
      full_name: "  Ada Lovelace  ",
      email: "Ada@Example.COM",
    });
    expect(ok.full_name).toBe("Ada Lovelace");
    expect(ok.email).toBe("ada@example.com");
  });

  test("search / sort / pagination", async () => {
    for (const [name, email] of [
      ["Zeta", "zeta@t.local"],
      ["Alpha", "alpha@t.local"],
      ["Beta", "beta@t.local"],
    ] as const) {
      const res = await server.fetch(
        new Request("http://t/employees", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ full_name: name, email }),
        }),
      );
      expect(res.status).toBe(201);
    }

    const sorted = await server.fetch(
      new Request("http://t/employees?sort=name:asc&take=2&skip=0"),
    );
    expect(sorted.status).toBe(200);
    const body = (await sorted.json()) as { data: Array<{ name: string }> };
    expect(body.data.length).toBe(2);
    expect(body.data[0]!.name).toBe("Alpha");

    const search = await server.fetch(
      new Request("http://t/employees?q=beta"),
    );
    const sbody = (await search.json()) as { data: unknown[] };
    expect(sbody.data.length).toBe(1);
  });

  test("soft-delete hides from default list", async () => {
    const create = await server.fetch(
      new Request("http://t/employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: "Borrar Me",
          email: "borrar@t.local",
        }),
      }),
    );
    const { data } = (await create.json()) as { data: { id: string } };

    const del = await server.fetch(
      new Request(`http://t/employees/${data.id}`, { method: "DELETE" }),
    );
    expect(del.status).toBe(200);

    const list = await server.fetch(new Request("http://t/employees"));
    const body = (await list.json()) as { data: unknown[] };
    expect(body.data.length).toBe(0);

    const all = await server.fetch(
      new Request("http://t/employees?include_inactive=1"),
    );
    const abody = (await all.json()) as { data: unknown[] };
    expect(abody.data.length).toBe(1);
  });

  test("duplicate email returns 409", async () => {
    await server.fetch(
      new Request("http://t/employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: "Uno",
          email: "dup@t.local",
        }),
      }),
    );
    const again = await server.fetch(
      new Request("http://t/employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: "Dos",
          email: "dup@t.local",
        }),
      }),
    );
    expect(again.status).toBe(409);
  });

  test("create/read/update round-trips optional user_id link", async () => {
    const create = await server.fetch(
      new Request("http://t/employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: "Linked User",
          email: "linked@t.local",
          user_id: "nox-user-abc",
        }),
      }),
    );
    expect(create.status).toBe(201);
    const created = (await create.json()) as {
      data: { id: string; user_id: string | null };
    };
    expect(created.data.user_id).toBe("nox-user-abc");

    const get = await server.fetch(
      new Request(`http://t/employees/${created.data.id}`),
    );
    const got = (await get.json()) as { data: { user_id: string | null } };
    expect(got.data.user_id).toBe("nox-user-abc");

    const patch = await server.fetch(
      new Request(`http://t/employees/${created.data.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: null }),
      }),
    );
    expect(patch.status).toBe(200);
    const patched = (await patch.json()) as {
      data: { user_id: string | null };
    };
    expect(patched.data.user_id).toBeNull();
  });

  test("GET /employees/:id/team", async () => {
    const mgr = await server.fetch(
      new Request("http://t/employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: "Manager",
          email: "mgr@t.local",
        }),
      }),
    );
    const manager = (await mgr.json()) as { data: { id: string } };
    await server.fetch(
      new Request("http://t/employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: "Report",
          email: "rep@t.local",
          manager_id: manager.data.id,
        }),
      }),
    );
    const team = await server.fetch(
      new Request(`http://t/employees/${manager.data.id}/team`),
    );
    expect(team.status).toBe(200);
    const body = (await team.json()) as { data: Array<{ email: string }> };
    expect(body.data.length).toBe(1);
    expect(body.data[0]!.email).toBe("rep@t.local");
  });
});
