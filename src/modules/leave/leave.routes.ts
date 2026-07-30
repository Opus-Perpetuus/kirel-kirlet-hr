import { define_module, define_routes } from "@opus-perpetuus/kirel-nox-kit";
import { leave_pages } from "./leave.pages.ts";
import {
  create_leave_request,
  create_leave_type,
  decide_leave_request,
  delete_leave_request,
  delete_leave_type,
  get_leave_balance,
  get_leave_request,
  get_leave_type,
  list_leave_balances,
  list_leave_requests,
  list_leave_types,
  patch_leave_balance,
  patch_leave_request,
  patch_leave_type,
  upsert_leave_balance,
} from "./leave.service.ts";
import { leave_tables } from "./leave.tables.ts";

const routes = define_routes({
  // leave-types
  "GET /leave-types": list_leave_types,
  "POST /leave-types": create_leave_type,
  "GET /leave-types/:id": get_leave_type,
  "PATCH /leave-types/:id": patch_leave_type,
  "DELETE /leave-types/:id": delete_leave_type,

  // leave-requests + workflow
  "GET /leave-requests": list_leave_requests,
  "POST /leave-requests": create_leave_request,
  "GET /leave-requests/:id": get_leave_request,
  "PATCH /leave-requests/:id": patch_leave_request,
  "DELETE /leave-requests/:id": delete_leave_request,
  "POST /leave-requests/:id/approve": (ctx) =>
    decide_leave_request(ctx, "approve"),
  "POST /leave-requests/:id/reject": (ctx) =>
    decide_leave_request(ctx, "reject"),
  "POST /leave-requests/:id/cancel": (ctx) =>
    decide_leave_request(ctx, "cancel"),

  // leave-balances
  "GET /leave-balances": list_leave_balances,
  "POST /leave-balances": upsert_leave_balance,
  "GET /leave-balances/:id": get_leave_balance,
  "PATCH /leave-balances/:id": patch_leave_balance,
});

export const leave_module = define_module({
  resource: "leave",
  aliases: ["leave-types", "leave-requests", "leave-balances"],
  labels: {
    singular: "Ausencia",
    plural: "Ausencias",
    read: "Ver ausencias",
    write: "Editar ausencias",
  },
  routes,
  tables: leave_tables,
  pages: leave_pages,
  menu: [
    {
      id: "hr.leave-requests",
      label: "Ausencias",
      order: 50,
      pageId: "hr.leave-requests",
      path: "leave-requests",
      permission: "kirlet.hr.leave.read",
      icon: "calendar",
    },
  ],
});
