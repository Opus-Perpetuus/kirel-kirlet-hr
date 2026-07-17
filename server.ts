/**
 * KIRLET-hr — Human Resources (Employees feature-shell parity).
 * Single menu: Employees. List / detail / edit + CRUD + local history.
 */

// (o==================================================================o)
//   #region TYPES
// (o-----------------------------------------------------------\/-----o)

/** Standard id + name plus HR fields. */
export type Employee = {
  id: string;
  /** Standard display name (feature-shell title). */
  name: string;
  full_name: string;
  email: string;
  department: string;
  hired_at: string;
  created_at: string;
  updated_at: string;
};

export type HistoryEntry = {
  id: string;
  resource: string;
  record_id: string;
  action: string;
  summary: string;
  payload: unknown;
  actor: string | null;
  created_at: string;
};

// (o-----------------------------------------------------------/\-----o)
//   #endregion TYPES
// (o==================================================================o)

// (o==================================================================o)
//   #region STATE / CONFIG
// (o-----------------------------------------------------------\/-----o)

const port = Number(process.env.PORT ?? 3000);
const technical_id = process.env.KIRLET_TECHNICAL_ID ?? "kirlet-hr";
const employees = new Map<string, Employee>();
const history: HistoryEntry[] = [];

// (o-----------------------------------------------------------/\-----o)
//   #endregion STATE / CONFIG
// (o==================================================================o)

// (o==================================================================o)
//   #region DOMAIN / HELPERS
// (o-----------------------------------------------------------\/-----o)

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function identity_from(req: Request) {
  return {
    user: req.headers.get("x-nox-user-email") ?? null,
    kirlet: req.headers.get("x-nox-kirlet-id") ?? technical_id,
  };
}

export function normalize_employee_input(body: unknown): {
  name: string;
  full_name: string;
  email: string;
  department: string;
} {
  if (!body || typeof body !== "object") {
    throw new Error("Body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const full_name = String(b.full_name ?? b.name ?? "").trim();
  const name = String(b.name ?? full_name).trim() || full_name;
  const email = String(b.email ?? "").trim().toLowerCase();
  const department = String(b.department ?? "general").trim() || "general";
  if (!full_name) throw new Error("full_name is required");
  if (!email || !email.includes("@")) throw new Error("valid email is required");
  return { name, full_name, email, department };
}

export function build_employee_row(
  input: {
    name: string;
    full_name: string;
    email: string;
    department: string;
  },
  now = new Date(),
): Employee {
  const id = `emp_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const iso = now.toISOString();
  return {
    id,
    name: input.name || input.full_name,
    full_name: input.full_name,
    email: input.email,
    department: input.department,
    hired_at: iso.slice(0, 10),
    created_at: iso,
    updated_at: iso,
  };
}

export function append_history(
  entry: Omit<HistoryEntry, "id" | "created_at">,
  now = new Date(),
): HistoryEntry {
  const row: HistoryEntry = {
    ...entry,
    id: `hist_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    created_at: now.toISOString(),
  };
  history.unshift(row);
  return row;
}

export function list_history(record_id?: string): HistoryEntry[] {
  if (!record_id) return [...history];
  return history.filter((h) => h.record_id === record_id);
}

/** Single menu: Employees only. */
export function build_hr_menu() {
  return {
    id: "hr.employees",
    label: "Employees",
    order: 10,
    realm: "internal",
    pageId: "hr.employees.list",
    path: "employees",
    permission: "kirlet.hr.employees.read",
  };
}

export function employee_list_rows() {
  return [...employees.values()].map((e) => ({
    id: e.id,
    name: e.name,
    full_name: e.full_name,
    email: e.email,
    department: e.department,
    hired_at: e.hired_at,
  }));
}

export function build_employees_list_page() {
  const rows = employee_list_rows();
  return {
    id: "hr.employees.list",
    owner: "kirlet-hr",
    title: "Employees",
    realms: {
      internal: {
        path: "kirlet-hr/employees",
        permission: "kirlet.hr.employees.read",
      },
    },
    page: {
      component: "nox.page",
      props: {
        title: "Employees",
        subtitle: "Listado de empleados",
      },
      children: [
        {
          component: "nox.stack",
          children: [
            {
              component: "nox.table",
              props: {
                fillHeight: true,
                paginate: true,
                columns: [
                  { key: "name", label: "Nombre" },
                  { key: "email", label: "Email" },
                  { key: "department", label: "Depto" },
                  { key: "hired_at", label: "Alta" },
                ],
                rows,
              },
            },
          ],
        },
      ],
    },
  };
}

export function build_employees_detail_page(emp: Employee) {
  return {
    id: "hr.employees.detail",
    owner: "kirlet-hr",
    title: emp.name,
    page: {
      component: "nox.page",
      props: {
        title: emp.name,
        subtitle: "Detalle del empleados",
      },
      children: [
        {
          component: "nox.form",
          props: { editable: false },
          children: form_fields_for(emp),
        },
      ],
    },
  };
}

export function build_employees_edit_page(emp: Employee) {
  return {
    id: "hr.employees.edit",
    owner: "kirlet-hr",
    title: `Editando el empleados: ${emp.name}`,
    page: {
      component: "nox.page",
      props: {
        title: `Editando el empleados: ${emp.name}`,
      },
      children: [
        {
          component: "nox.form",
          props: {
            action: `api://m/kirlet-hr/employees/${emp.id}`,
            method: "PATCH",
            editable: true,
          },
          children: form_fields_for(emp),
        },
      ],
    },
  };
}

function form_fields_for(emp?: Employee) {
  return [
    {
      component: "nox.input-text",
      props: {
        name: "name",
        label: "Nombre",
        required: true,
        value: emp?.name ?? "",
      },
    },
    {
      component: "nox.input-text",
      props: {
        name: "full_name",
        label: "Nombre completo",
        required: true,
        value: emp?.full_name ?? "",
      },
    },
    {
      component: "nox.input-text",
      props: {
        name: "email",
        label: "Correo",
        required: true,
        value: emp?.email ?? "",
      },
    },
    {
      component: "nox.input-text",
      props: {
        name: "department",
        label: "Departamento",
        value: emp?.department ?? "",
      },
    },
  ];
}

/** Seed demo employees (idempotent if map empty). */
export function seed_demo_employees(): number {
  if (employees.size > 0) return 0;
  const samples = [
    {
      name: "Ada Lovelace",
      full_name: "Ada Lovelace",
      email: "ada@example.com",
      department: "Engineering",
    },
    {
      name: "Grace Hopper",
      full_name: "Grace Hopper",
      email: "grace@example.com",
      department: "Engineering",
    },
  ];
  for (const s of samples) {
    const row = build_employee_row(s);
    employees.set(row.id, row);
    append_history({
      resource: "employee",
      record_id: row.id,
      action: "create",
      summary: `Employee created: ${row.name}`,
      payload: { after: row },
      actor: "seed",
    });
  }
  return samples.length;
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DOMAIN / HELPERS
// (o==================================================================o)

// (o==================================================================o)
//   #region HTTP SERVER
// (o-----------------------------------------------------------\/-----o)

export async function handle_request(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const actor = identity_from(req).user;

  if (path === "/health") {
    return json({
      status: "ok",
      service: technical_id,
      ready: true,
      time: new Date().toISOString(),
    });
  }

  if (path === "/manifest") {
    const file = Bun.file(new URL("./manifest.json", import.meta.url));
    return new Response(file, {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  if (path === "/menu") {
    return json({ data: [build_hr_menu()] });
  }

  if (path === "/pages") {
    return json({
      data: [
        { id: "hr.employees.list", path: "employees" },
        { id: "hr.employees.detail", path: "employees/detail" },
        { id: "hr.employees.edit", path: "employees/edit" },
      ],
    });
  }

  if (path === "/pages/hr.employees.list") {
    return json(build_employees_list_page());
  }

  if (path.startsWith("/pages/hr.employees.detail")) {
    const id = url.searchParams.get("id");
    const emp = id ? employees.get(id) : undefined;
    if (!emp) return json({ error: "not_found" }, 404);
    return json(build_employees_detail_page(emp));
  }

  if (path.startsWith("/pages/hr.employees.edit")) {
    const id = url.searchParams.get("id");
    const emp = id ? employees.get(id) : undefined;
    if (!emp) return json({ error: "not_found" }, 404);
    return json(build_employees_edit_page(emp));
  }

  if (path === "/employees" && req.method === "GET") {
    const data = [...employees.values()];
    return json({ data, total: data.length });
  }

  if (path === "/employees" && req.method === "POST") {
    try {
      const body = await req.json();
      const input = normalize_employee_input(body);
      const row = build_employee_row(input);
      employees.set(row.id, row);
      append_history({
        resource: "employee",
        record_id: row.id,
        action: "create",
        summary: `Employee created: ${row.name}`,
        payload: { after: row },
        actor,
      });
      return json({ data: row, identity: identity_from(req) }, 201);
    } catch (err) {
      return json(
        {
          error: "validation_error",
          message: err instanceof Error ? err.message : String(err),
        },
        400,
      );
    }
  }

  const emp_match = path.match(/^\/employees\/([^/]+)$/);
  if (emp_match) {
    const id = emp_match[1]!;
    const existing = employees.get(id);
    if (!existing) return json({ error: "not_found" }, 404);

    if (req.method === "GET") {
      return json({ data: existing });
    }

    if (req.method === "PATCH") {
      try {
        const body = await req.json();
        const input = normalize_employee_input({ ...existing, ...body });
        const updated: Employee = {
          ...existing,
          ...input,
          updated_at: new Date().toISOString(),
        };
        employees.set(id, updated);
        append_history({
          resource: "employee",
          record_id: id,
          action: "update",
          summary: `Employee updated: ${updated.name}`,
          payload: { before: existing, after: updated },
          actor,
        });
        return json({ data: updated });
      } catch (err) {
        return json(
          {
            error: "validation_error",
            message: err instanceof Error ? err.message : String(err),
          },
          400,
        );
      }
    }
  }

  if (path === "/history" && req.method === "GET") {
    const record_id = url.searchParams.get("record_id") ?? undefined;
    const data = list_history(record_id);
    return json({ data, total: data.length });
  }

  if (path === "/seed" && req.method === "POST") {
    const n = seed_demo_employees();
    return json({ seeded: n, total: employees.size });
  }

  if (path === "/" || path === "") {
    return json({
      service: technical_id,
      message:
        "HR kirlet — Employees feature-shell: /health, /menu, /pages, /employees",
      menu: build_hr_menu(),
    });
  }

  return json({ error: "not_found", path }, 404);
}

if (import.meta.main) {
  seed_demo_employees();
  const server = Bun.serve({
    port,
    fetch: handle_request,
  });
  console.log(
    `kirlet-hr listening on http://0.0.0.0:${server.port} (${technical_id})`,
  );
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion HTTP SERVER
// (o==================================================================o)
