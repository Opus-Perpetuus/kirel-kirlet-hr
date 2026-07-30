// (o==================================================================o)
//   #region SEED (define_kirlet seed callback)
// (o-----------------------------------------------------------\/-----o)

import type { KirletDataClient, NoxServices } from "@opus-perpetuus/kirel-nox-kit";
import { new_id, now_iso, today_iso } from "@opus-perpetuus/kirel-nox-kit";

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
export async function seed_leave_types(
  data: KirletDataClient,
): Promise<number> {
  const iso = now_iso();
  let n = 0;
  for (const lt of LEAVE_TYPE_CATALOG) {
    const existing = await data.findOne("leave_types", { name: lt.name });
    if (existing) continue;
    await data.insert("leave_types", {
      id: new_id("lt"),
      name: lt.name,
      paid: lt.paid,
      max_days_per_year: lt.max_days_per_year,
      active: true,
      created_at: iso,
      updated_at: iso,
    });
    n++;
  }
  return n;
}

/**
 * Full seed: leave types always; demo rows when employees empty.
 */
export async function seed_demo(ctx: {
  data: KirletDataClient;
  nox: NoxServices;
  technical_id: string;
}): Promise<void> {
  const { data, nox } = ctx;
  await seed_leave_types(data);

  const emp_count = await data.count("employees");
  if (emp_count > 0) return;

  const iso = now_iso();
  const today = today_iso();

  const dep_eng = new_id("dep");
  const dep_ops = new_id("dep");
  await data.insert("departments", {
    id: dep_eng,
    name: "Ingeniería",
    description: "Desarrollo y producto",
    active: true,
    created_at: iso,
    updated_at: iso,
  });
  await data.insert("departments", {
    id: dep_ops,
    name: "Operaciones",
    description: "Operaciones y soporte",
    active: true,
    created_at: iso,
    updated_at: iso,
  });

  const emp1 = new_id("emp");
  const emp2 = new_id("emp");
  await data.insert("employees", {
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
    active: true,
    created_at: iso,
    updated_at: iso,
  });
  await data.insert("employees", {
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
    active: true,
    created_at: iso,
    updated_at: iso,
  });

  await nox.history.append({
    resource: "employees",
    action: "create",
    entity_id: emp1,
    actor_label: "seed",
    payload: { after: { id: emp1, email: "ada@example.com" } },
  });
  await nox.history.append({
    resource: "employees",
    action: "create",
    entity_id: emp2,
    actor_label: "seed",
    payload: { after: { id: emp2, email: "grace@example.com" } },
  });

  const vac = await data.findOne("leave_types", { name: "vacaciones" });
  if (vac) {
    const year = new Date().getFullYear();
    for (const eid of [emp1, emp2]) {
      await data.insert("leave_balances", {
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
    await data.insert("leave_requests", {
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
  await data.insert("contracts", {
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
  const folio1 = await nox.counters.next(`incidents-${year}`, {
    prefix: `INC-${year}-`,
    pad_length: 4,
  });
  const folio2 = await nox.counters.next(`incidents-${year}`, {
    prefix: `INC-${year}-`,
    pad_length: 4,
  });
  await data.insert("incidents", {
    id: new_id("inc"),
    folio: folio1,
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
    active: true,
    created_at: iso,
    updated_at: iso,
  });
  await data.insert("incidents", {
    id: new_id("inc"),
    folio: folio2,
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
    active: true,
    created_at: iso,
    updated_at: iso,
  });
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion SEED
// (o==================================================================o)
