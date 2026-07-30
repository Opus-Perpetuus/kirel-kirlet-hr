import { describe, expect, test } from "bun:test";
import { employees_pages } from "./employees.pages.ts";

function form_fields(
  page: ReturnType<(typeof employees_pages)[0]["build"]>,
): Array<Record<string, unknown>> {
  const walk = (node: unknown): Array<Record<string, unknown>> | null => {
    if (!node || typeof node !== "object") return null;
    const n = node as {
      component?: string;
      props?: Record<string, unknown>;
      children?: unknown[];
    };
    if (n.component === "nox.feature-shell" && n.props) {
      const form = n.props["form"] as {
        fields?: Array<Record<string, unknown>>;
      };
      return form?.fields ?? null;
    }
    if (n.children) {
      for (const c of n.children) {
        const found = walk(c);
        if (found) return found;
      }
    }
    if (n.props && n.props["form"]) {
      const form = n.props["form"] as {
        fields?: Array<Record<string, unknown>>;
      };
      return form?.fields ?? null;
    }
    return null;
  };
  return walk(page.page) ?? [];
}

describe("employees page platform user field", () => {
  test("user_id is input-menu with platform users optionsSource", () => {
    const page = employees_pages[0]!.build({ url: null, identity: null });
    const fields = form_fields(page);
    const user = fields.find((f) => f["name"] === "user_id");
    expect(user).toBeTruthy();
    expect(user!["component"]).toBe("input-menu");
    const src = String(user!["optionsSource"] ?? "");
    expect(src).toMatch(/^api:\/\/users/);
  });
});
