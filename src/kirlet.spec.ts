import { describe, expect, test } from "bun:test";
import {
  assert_kirlet_conformance,
  create_kirlet_test_context,
  validate_kirlet_manifest,
  validate_page_descriptor,
} from "@opus-perpetuus/kirel-nox-kit";
import { join } from "node:path";
import pkg from "../package.json" with { type: "json" };
import { KIRLET } from "./kirlet.ts";

describe("kirlet-hr v2", () => {
  test("conformance layout", () => {
    assert_kirlet_conformance({
      definition: KIRLET,
      src_dir: join(import.meta.dir),
    });
  });

  test("manifest validates + compat + storage", () => {
    const m = KIRLET.manifest();
    const result = validate_kirlet_manifest(m);
    expect(result.ok).toBe(true);
    expect(m.id).toBe("KIRLET-hr");
    expect(m.technicalId).toBe("kirlet-hr");
    // Against package.json, not a literal: a pinned string is what let the
    // manifest drift a whole release behind in the first place.
    expect(m.version).toBe(pkg.version);
    expect(m.compat.nox).toBe(">=0.5.0");
    expect(m.compat.kit).toBe("^0.5.0");
    expect(m.storage?.domain).toBe("shared-nox-postgres");
    expect(m.storage?.files).toBe(true);
    expect(m.resources?.employees).toBe("employees");
    expect(m.resources?.leave).toBe("leave");
    expect(m.resources?.["leave-requests"]).toBe("leave");
    expect(m.widgets?.map((w) => w.id)).toEqual([
      "headcount",
      "leave",
      "incidents",
    ]);
    expect(m.widgets?.every((w) => w.capability === "embedded")).toBe(true);
  });

  test("schema v2 without history table", () => {
    const schema = KIRLET.schema();
    expect(schema.version).toBe(2);
    const names = schema.tables.map((t) => t.name);
    expect(names).toContain("employees");
    expect(names).toContain("departments");
    expect(names).toContain("leave_types");
    expect(names).toContain("incidents");
    expect(names).not.toContain("history");
  });

  test("permissions and page ids preserved", () => {
    const m = KIRLET.manifest();
    const perm_ids = new Set((m.permissions ?? []).map((p) => p.id));
    for (const id of [
      "kirlet.hr.employees.read",
      "kirlet.hr.employees.write",
      "kirlet.hr.leave.read",
      "kirlet.hr.dashboard.read",
      "kirlet.hr.incidents.write",
    ]) {
      expect(perm_ids.has(id)).toBe(true);
    }
    const page_ids = new Set((m.pages ?? []).map((p) => p.id));
    for (const id of [
      "hr.dashboard",
      "hr.employees",
      "hr.departments",
      "hr.positions",
      "hr.contracts",
      "hr.leave-requests",
      "hr.documents",
      "hr.incidents",
    ]) {
      expect(page_ids.has(id)).toBe(true);
    }
  });

  test("menu structure under hr.nav with icons", () => {
    const m = KIRLET.manifest();
    expect(m.menu?.length).toBe(1);
    const root = m.menu![0]!;
    expect(root.id).toBe("hr.nav");
    expect(root.label).toBe("RR.HH.");
    const leaves = root.children ?? [];
    expect(leaves.length).toBeGreaterThanOrEqual(8);
    const by_id = new Map(leaves.map((l) => [l.id, l]));
    expect(by_id.get("hr.employees")?.icon).toBe("users");
    expect(by_id.get("hr.dashboard")?.permission).toBe(
      "kirlet.hr.dashboard.read",
    );
  });

  test("all pages build valid descriptors", () => {
    for (const mod of KIRLET.modules) {
      for (const p of mod.pages ?? []) {
        const page = p.build({ url: null, identity: null });
        const result = validate_page_descriptor(page);
        expect(result.ok).toBe(true);
      }
    }
  });

  test("meta + health via test context", async () => {
    const server = create_kirlet_test_context(KIRLET);
    const health = await server.fetch(new Request("http://t/health"));
    expect(health.status).toBe(200);
    const man = await server.fetch(new Request("http://t/manifest"));
    expect(man.status).toBe(200);
    const schema = await server.fetch(new Request("http://t/schema"));
    expect(schema.status).toBe(200);
    server.stop();
  });
});
