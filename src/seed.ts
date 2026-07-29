// (o==================================================================o)
//   #region SEED
// (o-----------------------------------------------------------\/-----o)

import { get_db } from "./db.ts";
import { new_id, now_iso, today_iso } from "./http.ts";
import { append_history } from "./history.ts";

const LEAVE_TYPE_CATALOG = [
  { name: "vacaciones", paid: 1, max_days_per_year: 12 },
  { name: "permiso sin goce", paid: 0, max_days_per_year: null as number | null },
  { name: "incapacidad", paid: 1, max_days_per_year: null as number | null },
];

/** Always ensure leave_types catalog exists (idempotent by name). */
export function seed_leave_types(): number {
  const db = get_db();
  const iso = now_iso();
  let n = 0;
  for (const lt of LEAVE_TYPE_CATALOG) {
    const existing = db
      .query(`SELECT id FROM leave_types WHERE name = ?`)
      .get(lt.name) as { id: string } | null;
    if (existing) continue;
    const id = new_id("lt");
    db.query(
      `INSERT INTO leave_types (id, name, paid, max_days_per_year, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
    ).run(id, lt.name, lt.paid, lt.max_days_per_year, iso, iso);
    n++;
  }
  return n;
}

/**
 * Demo seed: 2 departments + 2 employees.
 * Only when KIRLET_SEED_DEMO=1 and employees table empty.
 */
export function seed_demo(): { departments: number; employees: number } {
  const db = get_db();
  const emp_count = (
    db.query(`SELECT COUNT(*) AS c FROM employees`).get() as { c: number }
  ).c;
  if (emp_count > 0) {
    return { departments: 0, employees: 0 };
  }

  const iso = now_iso();
  const today = today_iso();

  const dep_eng = new_id("dep");
  const dep_ops = new_id("dep");
  db.query(
    `INSERT INTO departments (id, name, description, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)`,
  ).run(dep_eng, "Ingeniería", "Desarrollo y producto", iso, iso);
  db.query(
    `INSERT INTO departments (id, name, description, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)`,
  ).run(dep_ops, "Operaciones", "Operaciones y soporte", iso, iso);

  const emp1 = new_id("emp");
  const emp2 = new_id("emp");
  db.query(
    `INSERT INTO employees (
      id, name, full_name, email, department_id, position_id, manager_id,
      user_id, hired_at, phone, rfc, curp, nss, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, NULL, NULL, NULL, NULL, 1, ?, ?)`,
  ).run(
    emp1,
    "Ada Lovelace",
    "Ada Lovelace",
    "ada@example.com",
    dep_eng,
    "user-demo-ada",
    today,
    iso,
    iso,
  );
  db.query(
    `INSERT INTO employees (
      id, name, full_name, email, department_id, position_id, manager_id,
      user_id, hired_at, phone, rfc, curp, nss, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, ?, NULL, NULL, NULL, NULL, 1, ?, ?)`,
  ).run(
    emp2,
    "Grace Hopper",
    "Grace Hopper",
    "grace@example.com",
    dep_eng,
    emp1,
    today,
    iso,
    iso,
  );

  append_history({
    resource: "employees",
    record_id: emp1,
    action: "create",
    summary: "Empleado creado: Ada Lovelace",
    payload: { after: { id: emp1, email: "ada@example.com" } },
    actor: "seed",
  });
  append_history({
    resource: "employees",
    record_id: emp2,
    action: "create",
    summary: "Empleado creado: Grace Hopper",
    payload: { after: { id: emp2, email: "grace@example.com" } },
    actor: "seed",
  });

  // Demo balances for vacaciones
  const vac = db
    .query(`SELECT id FROM leave_types WHERE name = 'vacaciones'`)
    .get() as { id: string } | null;
  if (vac) {
    const year = new Date().getFullYear();
    for (const eid of [emp1, emp2]) {
      db.query(
        `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, entitled_days, used_days)
         VALUES (?, ?, ?, ?, 12, 0)`,
      ).run(new_id("lb"), eid, vac.id, year);
    }
    // Pending leave so the panel is not all zeros
    const in_two_weeks = new Date();
    in_two_weeks.setDate(in_two_weeks.getDate() + 14);
    const in_three_weeks = new Date();
    in_three_weeks.setDate(in_three_weeks.getDate() + 21);
    const d = (x: Date) => x.toISOString().slice(0, 10);
    db.query(
      `INSERT INTO leave_requests (
         id, employee_id, leave_type_id, start_date, end_date, days, reason,
         status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, 5, 'Vacaciones demo', 'pendiente', ?, ?)`,
    ).run(
      new_id("lr"),
      emp2,
      vac.id,
      d(in_two_weeks),
      d(in_three_weeks),
      iso,
      iso,
    );
  }

  // Contract expiring within 30d for dashboard metric
  const end = new Date();
  end.setDate(end.getDate() + 20);
  db.query(
    `INSERT INTO contracts (
       id, employee_id, type, start_date, end_date, salary, currency, schedule,
       status, notes, created_at, updated_at
     ) VALUES (?, ?, 'determinado', ?, ?, 45000, 'MXN', 'completa', 'activo', 'Demo seed', ?, ?)`,
  ).run(
    new_id("ctr"),
    emp1,
    today,
    end.toISOString().slice(0, 10),
    iso,
    iso,
  );

  return { departments: 2, employees: 2 };
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion SEED
// (o==================================================================o)
