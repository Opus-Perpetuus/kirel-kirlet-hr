// (o==================================================================o)
//   #region SEED (kit repository — async)
// (o-----------------------------------------------------------\/-----o)

import { KirletRepository } from "@opus-perpetuus/kirel-nox-kit";
import { get_data } from "./data/bootstrap.ts";
import { HistoryService } from "./data/history.service.ts";
import { new_id, now_iso, today_iso } from "./http.ts";

const LEAVE_TYPE_CATALOG = [
  { name: "vacaciones", paid: 1, max_days_per_year: 12 as number | null },
  {
    name: "permiso sin goce",
    paid: 0,
    max_days_per_year: null as number | null,
  },
  {
    name: "incapacidad",
    paid: 1,
    max_days_per_year: null as number | null,
  },
];

/** Always ensure leave_types catalog exists (idempotent by name). */
export async function seed_leave_types(): Promise<number> {
  const types = new KirletRepository(get_data(), "leave_types");
  const iso = now_iso();
  let n = 0;
  for (const lt of LEAVE_TYPE_CATALOG) {
    const existing = await types.findOne({ name: lt.name });
    if (existing) continue;
    await types.insert({
      id: new_id("lt"),
      name: lt.name,
      paid: lt.paid,
      max_days_per_year: lt.max_days_per_year,
      is_active: 1,
      created_at: iso,
      updated_at: iso,
    });
    n++;
  }
  return n;
}

/**
 * Demo seed: 2 departments + 2 employees.
 * Only when KIRLET_SEED_DEMO=1 and employees table empty.
 */
export async function seed_demo(): Promise<{
  departments: number;
  employees: number;
}> {
  const data = get_data();
  const employees = new KirletRepository(data, "employees");
  const departments = new KirletRepository(data, "departments");
  const leave_types = new KirletRepository(data, "leave_types");
  const leave_balances = new KirletRepository(data, "leave_balances");
  const leave_requests = new KirletRepository(data, "leave_requests");
  const contracts = new KirletRepository(data, "contracts");
  const incidents = new KirletRepository(data, "incidents");
  const history = new HistoryService(data);

  const emp_count = await employees.count();
  if (emp_count > 0) {
    return { departments: 0, employees: 0 };
  }

  const iso = now_iso();
  const today = today_iso();

  const dep_eng = new_id("dep");
  const dep_ops = new_id("dep");
  await departments.insert({
    id: dep_eng,
    name: "Ingeniería",
    description: "Desarrollo y producto",
    is_active: 1,
    created_at: iso,
    updated_at: iso,
  });
  await departments.insert({
    id: dep_ops,
    name: "Operaciones",
    description: "Operaciones y soporte",
    is_active: 1,
    created_at: iso,
    updated_at: iso,
  });

  const emp1 = new_id("emp");
  const emp2 = new_id("emp");
  await employees.insert({
    id: emp1,
    name: "Ada Lovelace",
    full_name: "Ada Lovelace",
    email: "ada@example.com",
    department_id: dep_eng,
    position_id: null,
    manager_id: null,
    user_id: "user-demo-ada",
    hired_at: today,
    phone: null,
    rfc: null,
    curp: null,
    nss: null,
    is_active: 1,
    created_at: iso,
    updated_at: iso,
  });
  await employees.insert({
    id: emp2,
    name: "Grace Hopper",
    full_name: "Grace Hopper",
    email: "grace@example.com",
    department_id: dep_eng,
    position_id: null,
    manager_id: emp1,
    user_id: null,
    hired_at: today,
    phone: null,
    rfc: null,
    curp: null,
    nss: null,
    is_active: 1,
    created_at: iso,
    updated_at: iso,
  });

  await history.append({
    resource: "employees",
    record_id: emp1,
    action: "create",
    summary: "Empleado creado: Ada Lovelace",
    payload: { after: { id: emp1, email: "ada@example.com" } },
    actor: "seed",
  });
  await history.append({
    resource: "employees",
    record_id: emp2,
    action: "create",
    summary: "Empleado creado: Grace Hopper",
    payload: { after: { id: emp2, email: "grace@example.com" } },
    actor: "seed",
  });

  const vac = await leave_types.findOne({ name: "vacaciones" });
  if (vac) {
    const year = new Date().getFullYear();
    for (const eid of [emp1, emp2]) {
      await leave_balances.insert({
        id: new_id("lb"),
        employee_id: eid,
        leave_type_id: vac.id,
        year,
        entitled_days: 12,
        used_days: 0,
      });
    }
    const in_two_weeks = new Date();
    in_two_weeks.setDate(in_two_weeks.getDate() + 14);
    const in_three_weeks = new Date();
    in_three_weeks.setDate(in_three_weeks.getDate() + 21);
    const d = (x: Date) => x.toISOString().slice(0, 10);
    await leave_requests.insert({
      id: new_id("lr"),
      employee_id: emp2,
      leave_type_id: vac.id,
      start_date: d(in_two_weeks),
      end_date: d(in_three_weeks),
      days: 5,
      reason: "Vacaciones demo",
      status: "pendiente",
      decided_by: null,
      decided_at: null,
      decision_note: null,
      created_at: iso,
      updated_at: iso,
    });
  }

  const end = new Date();
  end.setDate(end.getDate() + 20);
  await contracts.insert({
    id: new_id("ctr"),
    employee_id: emp1,
    type: "determinado",
    start_date: today,
    end_date: end.toISOString().slice(0, 10),
    salary: 45000,
    currency: "MXN",
    schedule: "completa",
    status: "activo",
    notes: "Demo seed",
    created_at: iso,
    updated_at: iso,
  });

  const year = new Date().getFullYear();
  await incidents.insert({
    id: new_id("inc"),
    folio: `INC-${year}-0001`,
    title: "Resbalón en pasillo",
    description: "Piso mojado sin señalización",
    employee_id: emp1,
    type: "accidente",
    severity: "media",
    status: "abierta",
    occurred_at: today,
    location: "Planta demo",
    reported_by: "seed",
    assigned_to: null,
    resolution_note: null,
    closed_at: null,
    is_active: 1,
    created_at: iso,
    updated_at: iso,
  });
  await incidents.insert({
    id: new_id("inc"),
    folio: `INC-${year}-0002`,
    title: "Ruido excesivo en área de trabajo",
    description: "Reporte de molestia acústica en el open space",
    employee_id: emp2,
    type: "queja",
    severity: "baja",
    status: "en_revision",
    occurred_at: today,
    location: "Oficinas",
    reported_by: "seed",
    assigned_to: "RR.HH.",
    resolution_note: null,
    closed_at: null,
    is_active: 1,
    created_at: iso,
    updated_at: iso,
  });

  return { departments: 2, employees: 2 };
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion SEED
// (o==================================================================o)
