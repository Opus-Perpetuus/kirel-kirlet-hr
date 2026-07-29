import { describe, expect, test } from "bun:test";
import { build_hr_menu } from "./menu.ts";

describe("build_hr_menu icons", () => {
  test("every menu item has a non-empty icon id", () => {
    const menu = build_hr_menu();
    expect(menu.length).toBeGreaterThanOrEqual(7);
    for (const item of menu) {
      expect(item.icon?.length).toBeGreaterThan(0);
    }
  });

  test("employees uses users icon", () => {
    const employees = build_hr_menu().find((m) => m.id === "hr.employees");
    expect(employees?.icon).toBe("users");
  });
});
