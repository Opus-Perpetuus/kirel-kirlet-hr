// (o==================================================================o)
//   #region HR APP (KirletApp + all domain modules)
// (o-----------------------------------------------------------\/-----o)

import {
  KirletApp,
  MemoryKirletDataClient,
  type KirletDataClient,
} from "@opus-perpetuus/kirel-nox-kit";
import { HR_SCHEMA } from "../schema/hr.schema.ts";
import { get_technical_id, get_files_dir } from "../config.ts";
import {
  get_data,
  init_data,
  reset_data_for_tests,
  close_data,
} from "../data/bootstrap.ts";
import { EmployeesModule } from "../modules/employees/employees.module.ts";
import { DepartmentsModule } from "../modules/departments/departments.module.ts";
import { PositionsModule } from "../modules/positions/positions.module.ts";
import { ContractsModule } from "../modules/contracts/contracts.module.ts";
import { LeaveModule } from "../modules/leave/leave.module.ts";
import { DocumentsModule } from "../modules/documents/documents.module.ts";
import { DashboardModule } from "../modules/dashboard/dashboard.module.ts";
import { IncidentsModule } from "../modules/incidents/incidents.module.ts";

let app: KirletApp | null = null;

export function create_hr_app(data: KirletDataClient): KirletApp {
  return new KirletApp({
    technicalId: get_technical_id(),
    data,
    schema: HR_SCHEMA,
    modules: [
      new DashboardModule(data),
      new EmployeesModule(data),
      new DepartmentsModule(data),
      new PositionsModule(data),
      new ContractsModule(data),
      new LeaveModule(data),
      new DocumentsModule(data),
      new IncidentsModule(data),
    ],
    filesDir: get_files_dir(),
  });
}

export function get_hr_app(): KirletApp {
  if (!app) {
    throw new Error("HR app not initialized — call init_hr_app() first");
  }
  return app;
}

/** Boot data client + app shell. */
export function init_hr_app(data?: KirletDataClient): KirletApp {
  const d = data ?? init_data();
  app = create_hr_app(d);
  return app;
}

/** Fresh memory store + app (tests). */
export function reset_hr_app_for_tests(): MemoryKirletDataClient {
  const mem = reset_data_for_tests();
  app = create_hr_app(mem);
  return mem;
}

export function close_hr_app(): void {
  app = null;
  close_data();
}

export { get_data, HR_SCHEMA };

// (o-----------------------------------------------------------/\-----o)
//   #endregion HR APP
// (o==================================================================o)
