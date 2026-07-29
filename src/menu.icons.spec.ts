import { describe, expect, test } from "bun:test";
import { build_hr_menu, flatten_menu_leaves } from "./menu.ts";

describe("build_hr_menu icons", () => {
  test("every navigable leaf has a non-empty icon id", () => {
    const leaves = flatten_menu_leaves(build_hr_menu());
    expect(leaves.length).toBeGreaterThanOrEqual(7);
    for (const item of leaves) {
      expect(item.icon?.length).toBeGreaterThan(0);
    }
  });

  test("employees uses users icon", () => {
    const employees = flatten_menu_leaves(build_hr_menu()).find(
      (m) => m.id === "hr.employees",
    );
    expect(employees?.icon).toBe("users");
  });
});
