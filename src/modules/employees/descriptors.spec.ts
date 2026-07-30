import { describe, expect, test } from "bun:test";
import { build_employees_page } from "./descriptors.ts";

// (o==================================================================o)
//   #region EMPLOYEE DESCRIPTOR — PLATFORM USER MENU
// (o-----------------------------------------------------------\/-----o)

function form_fields(
  page: ReturnType<typeof build_employees_page>,
): Array<Record<string, unknown>> {
  const walk = (node: unknown): Array<Record<string, unknown>> | null => {
    if (!node || typeof node !== "object") return null;
    const n = node as {
      component?: string;
      props?: Record<string, unknown>;
      children?: unknown[];
    };
    if (n.component === "nox.feature-shell" && n.props) {
      const form = n.props["form"] as { fields?: Array<Record<string, unknown>> };
      return form?.fields ?? null;
    }
    if (n.children) {
      for (const c of n.children) {
        const found = walk(c);
        if (found) return found;
      }
    }
    if (n.props && n.props["form"]) {
      const form = n.props["form"] as { fields?: Array<Record<string, unknown>> };
      return form?.fields ?? null;
    }
    return null;
  };
  return walk(page.page) ?? [];
}

describe("employees descriptor platform user field", () => {
  test("user_id is input-menu with platform users optionsSource", () => {
    const page = build_employees_page();
    const fields = form_fields(page);
    const user = fields.find((f) => f["name"] === "user_id");
    expect(user).toBeTruthy();
    expect(user!["component"]).toBe("input-menu");
    expect(user!["component"]).not.toBe("input-text");
    const src = String(user!["optionsSource"] ?? "");
    expect(src.length).toBeGreaterThan(0);
    // Platform NOX users (not a free-text id placeholder).
    expect(src).toMatch(/^api:\/\/users/);
    expect(String(user!["label"] ?? "").toLowerCase()).toMatch(/usuario/);
  });

  test("other menus still use kirlet-hr options endpoints", () => {
    const fields = form_fields(build_employees_page());
    const dept = fields.find((f) => f["name"] === "department_id");
    expect(dept?.["component"]).toBe("input-menu");
    expect(String(dept?.["optionsSource"])).toContain("departments");
  });
});

// (o-----------------------------------------------------------/\-----o)
//   #endregion EMPLOYEE DESCRIPTOR — PLATFORM USER MENU
// (o==================================================================o)
