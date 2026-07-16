import { describe, expect, test } from "bun:test";
import {
  build_employee_register_page_descriptor,
  build_employee_row,
  build_hr_menu,
  normalize_employee_input,
} from "./server";

// (o==================================================================o)
//   #region TESTS
// (o-----------------------------------------------------------\/-----o)

describe("kirlet-hr employee registration", () => {
  test("normalize_employee_input requires name and email", () => {
    expect(() => normalize_employee_input({})).toThrow(/full_name/);
    expect(() =>
      normalize_employee_input({ full_name: "Ada", email: "bad" }),
    ).toThrow(/email/);
    const ok = normalize_employee_input({
      full_name: "  Ada Lovelace  ",
      email: "Ada@Example.COM",
      department: "Engineering",
    });
    expect(ok.full_name).toBe("Ada Lovelace");
    expect(ok.email).toBe("ada@example.com");
    expect(ok.department).toBe("Engineering");
  });

  test("build_employee_row assigns id and dates", () => {
    const row = build_employee_row(
      {
        full_name: "Ada Lovelace",
        email: "ada@example.com",
        department: "Engineering",
      },
      new Date("2026-07-16T00:00:00.000Z"),
    );
    expect(row.id.startsWith("emp_")).toBe(true);
    expect(row.hired_at).toBe("2026-07-16");
    expect(row.created_at).toBe("2026-07-16T00:00:00.000Z");
  });

  test("HR menu has employee registration sub-menu", () => {
    const menu = build_hr_menu();
    expect(menu.id).toBe("hr.root");
    expect(menu.children).toHaveLength(1);
    expect(menu.children[0]!.id).toBe("hr.employees.register");
    expect(menu.children[0]!.label).toMatch(/empleados/i);
  });

  test("register page uses only nox.* components", () => {
    const page = build_employee_register_page_descriptor();
    expect(page.id).toBe("hr.employees.register");
    expect(page.owner).toBe("kirlet-hr");
    const ids: string[] = [];
    const walk = (n: { component?: string; children?: unknown[] }) => {
      if (n.component) ids.push(n.component);
      for (const c of n.children ?? []) {
        if (c && typeof c === "object") walk(c as { component?: string; children?: unknown[] });
      }
    };
    walk(page.page);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(id.startsWith("nox.")).toBe(true);
    }
    expect(ids).toContain("nox.form");
    expect(ids).toContain("nox.input-text");
    expect(ids).toContain("nox.table");
  });
});

// (o-----------------------------------------------------------/\-----o)
//   #endregion TESTS
// (o==================================================================o)
