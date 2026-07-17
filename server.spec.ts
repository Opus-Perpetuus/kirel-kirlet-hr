import { describe, expect, test } from "bun:test";
import {
  append_history,
  build_employee_row,
  build_employees_detail_page,
  build_employees_edit_page,
  build_employees_list_page,
  build_hr_menu,
  handle_request,
  list_history,
  normalize_employee_input,
  seed_demo_employees,
} from "./server";

// (o==================================================================o)
//   #region TESTS
// (o-----------------------------------------------------------\/-----o)

describe("kirlet-hr employees", () => {
  test("normalize requires name/email", () => {
    expect(() => normalize_employee_input({})).toThrow(/full_name/);
    const ok = normalize_employee_input({
      full_name: "  Ada Lovelace  ",
      email: "Ada@Example.COM",
      department: "Engineering",
    });
    expect(ok.name).toBe("Ada Lovelace");
    expect(ok.email).toBe("ada@example.com");
  });

  test("employee has standard id + name", () => {
    const row = build_employee_row({
      name: "Ada",
      full_name: "Ada Lovelace",
      email: "ada@example.com",
      department: "Engineering",
    });
    expect(row.id).toBeTruthy();
    expect(row.name).toBe("Ada");
  });

  test("menu is single Employees entry", () => {
    const menu = build_hr_menu();
    expect(menu.id).toBe("hr.employees");
    expect(menu.label).toBe("Employees");
    expect((menu as { children?: unknown }).children).toBeUndefined();
  });

  test("list page uses nox.* and fillHeight table", () => {
    const page = build_employees_list_page();
    expect(page.id).toBe("hr.employees.list");
    const ids: string[] = [];
    const walk = (n: { component?: string; children?: unknown[]; props?: Record<string, unknown> }) => {
      if (n.component) ids.push(n.component);
      if (n.props?.fillHeight) ids.push("fillHeight");
      for (const c of n.children ?? []) {
        if (c && typeof c === "object") {
          walk(c as { component?: string; children?: unknown[] });
        }
      }
    };
    walk(page.page);
    expect(ids).toContain("nox.table");
    expect(ids.every((x) => x === "fillHeight" || x.startsWith("nox."))).toBe(
      true,
    );
  });

  test("detail and edit titles follow page rules", () => {
    const emp = build_employee_row({
      name: "Ada",
      full_name: "Ada Lovelace",
      email: "a@b.c",
      department: "Eng",
    });
    const detail = build_employees_detail_page(emp);
    expect(detail.page.props.title).toBe("Ada");
    expect(detail.page.props.subtitle).toBe("Detalle del empleados");
    const edit = build_employees_edit_page(emp);
    expect(edit.page.props.title).toBe("Editando el empleados: Ada");
    expect((edit.page.props as { subtitle?: string }).subtitle).toBeUndefined();
  });

  test("history append and list by record", () => {
    const emp = build_employee_row({
      name: "X",
      full_name: "X",
      email: "x@y.z",
      department: "Ops",
    });
    append_history({
      resource: "employee",
      record_id: emp.id,
      action: "create",
      summary: "created",
      payload: { after: emp },
      actor: "test",
    });
    expect(list_history(emp.id).length).toBeGreaterThan(0);
  });

  test("HTTP CRUD smoke", async () => {
    const create = await handle_request(
      new Request("http://local/employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: "Test User",
          email: "test@kirel.local",
          department: "QA",
        }),
      }),
    );
    expect(create.status).toBe(201);
    const created = (await create.json()) as { data: { id: string } };
    const id = created.data.id;

    const get = await handle_request(
      new Request(`http://local/employees/${id}`),
    );
    expect(get.status).toBe(200);

    const patch = await handle_request(
      new Request(`http://local/employees/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ department: "Sales" }),
      }),
    );
    expect(patch.status).toBe(200);

    const hist = await handle_request(
      new Request(`http://local/history?record_id=${id}`),
    );
    expect(hist.status).toBe(200);
    const body = (await hist.json()) as { total: number };
    expect(body.total).toBeGreaterThan(0);
  });

  test("seed demo employees", () => {
    // May already be seeded from other tests; just ensure callable
    const n = seed_demo_employees();
    expect(n).toBeGreaterThanOrEqual(0);
  });
});

// (o-----------------------------------------------------------/\-----o)
//   #endregion TESTS
// (o==================================================================o)
