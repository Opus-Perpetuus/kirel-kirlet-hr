/**
 * KIRLET-hr — Human Resources kirlet (employee registration MVP).
 * Domain API + health + declarative page/menu descriptors.
 * Trusts NOX gateway identity headers; no parallel staff auth.
 */

// (o==================================================================o)
//   #region TYPES
// (o-----------------------------------------------------------\/-----o)

type Employee = {
  id: string;
  full_name: string;
  email: string;
  department: string;
  hired_at: string;
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
  full_name: string;
  email: string;
  department: string;
} {
  if (!body || typeof body !== "object") {
    throw new Error("Body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const full_name = String(b.full_name ?? b.name ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const department = String(b.department ?? "general").trim() || "general";
  if (!full_name) throw new Error("full_name is required");
  if (!email || !email.includes("@")) throw new Error("valid email is required");
  return { full_name, email, department };
}

export function build_employee_row(
  input: { full_name: string; email: string; department: string },
  now = new Date(),
): Employee {
  const id = `emp_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    full_name: input.full_name,
    email: input.email,
    department: input.department,
    hired_at: now.toISOString().slice(0, 10),
    created_at: now.toISOString(),
  };
}

/** Sub-menu for HR (kirlets own nested menus). */
export function build_hr_menu() {
  return {
    id: "hr.root",
    label: "HR",
    order: 50,
    realm: "internal",
    children: [
      {
        id: "hr.employees.register",
        label: "Registro de empleados",
        order: 10,
        realm: "internal",
        pageId: "hr.employees.register",
        path: "employees/register",
        permission: "kirlet.hr.employees.write",
      },
    ],
  };
}

/**
 * Employee registration page — only allowlisted nox.* components
 * (form, inputs, table, card, stack, page, button, alert).
 */
export function build_employee_register_page_descriptor() {
  const rows = [...employees.values()].map((e) => ({
    id: e.id,
    full_name: e.full_name,
    email: e.email,
    department: e.department,
    hired_at: e.hired_at,
  }));
  return {
    id: "hr.employees.register",
    owner: "kirlet-hr",
    title: "Registro de empleados",
    realms: {
      internal: {
        path: "kirlet-hr/employees/register",
        permission: "kirlet.hr.employees.write",
      },
    },
    menu: {
      label: "Registro de empleados",
      order: 10,
      realm: "internal",
      permission: "kirlet.hr.employees.write",
      parent: "hr.root",
    },
    page: {
      component: "nox.page",
      props: {
        title: "Registro de empleados",
        subtitle: "HR kirlet — alta de personal (nox.* only)",
      },
      children: [
        {
          component: "nox.stack",
          children: [
            {
              component: "nox.alert",
              props: { tone: "info", title: "Kirlet HR" },
              text: "Sub-menú propio del kirlet. La UI usa solo componentes nox.* / Kirita del núcleo.",
            },
            {
              component: "nox.card",
              props: { title: "Nuevo empleado" },
              children: [
                {
                  component: "nox.form",
                  props: {
                    action: "api://m/kirlet-hr/employees",
                    method: "POST",
                  },
                  children: [
                    {
                      component: "nox.input-text",
                      props: {
                        name: "full_name",
                        label: "Nombre completo",
                        required: true,
                      },
                    },
                    {
                      component: "nox.input-text",
                      props: {
                        name: "email",
                        label: "Correo",
                        required: true,
                      },
                    },
                    {
                      component: "nox.input-text",
                      props: {
                        name: "department",
                        label: "Departamento",
                      },
                    },
                    {
                      component: "nox.button",
                      props: { variant: "primary", type: "submit" },
                      text: "Registrar",
                    },
                  ],
                },
              ],
            },
            {
              component: "nox.card",
              props: { title: "Empleados registrados" },
              children: [
                {
                  component: "nox.table",
                  props: {
                    paginate: false,
                    columns: [
                      { key: "full_name", label: "Nombre" },
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
      ],
    },
  };
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

  if (path === "/pages" || path === "/pages/hr.employees.register") {
    return json(build_employee_register_page_descriptor());
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
      return json(
        {
          data: row,
          identity: identity_from(req),
          message: "Employee registered",
        },
        201,
      );
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

  if (path === "/" || path === "") {
    return json({
      service: technical_id,
      message:
        "HR kirlet — /health, /menu, /pages, /employees via NOX /api/m/kirlet-hr",
      menu: build_hr_menu(),
    });
  }

  return json({ error: "not_found", path }, 404);
}

if (import.meta.main) {
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
