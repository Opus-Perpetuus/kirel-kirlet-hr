// (o==================================================================o)
//   #region LEAVE WORKFLOW SERVICE
// (o-----------------------------------------------------------\/-----o)

import {
  KirletHttpError,
  new_id,
  now_iso,
  type DomainRow,
  type KirletCtx,
} from "@opus-perpetuus/kirel-nox-kit";

export function compute_days(start: string, end: string): number {
  const a = Date.parse(start);
  const b = Date.parse(end);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) {
    throw new KirletHttpError(400, "validation_error", "rango de fechas inválido");
  }
  const ms = b - a;
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

export function normalize_leave_type_input(
  body: unknown,
  partial = false,
): Partial<DomainRow> {
  if (!body || typeof body !== "object") {
    throw new KirletHttpError(400, "validation_error", "El cuerpo debe ser un objeto JSON");
  }
  const b = body as Record<string, unknown>;
  const out: DomainRow = {};
  if (b.name !== undefined || !partial) {
    const name = String(b.name ?? "").trim();
    if (!name && !partial) {
      throw new KirletHttpError(400, "validation_error", "name es requerido", {
        field: "name",
      });
    }
    if (name) out.name = name;
  }
  if (b.paid !== undefined) {
    out.paid = b.paid === true || b.paid === 1 || b.paid === "1" ? 1 : 0;
  }
  if (b.max_days_per_year !== undefined) {
    out.max_days_per_year =
      b.max_days_per_year == null || b.max_days_per_year === ""
        ? null
        : Number(b.max_days_per_year);
  }
  if (b.active !== undefined || b.is_active !== undefined) {
    const raw = b.active !== undefined ? b.active : b.is_active;
    out.active =
      raw === true || raw === 1 || raw === "1" || raw === "true";
  }
  return out;
}

export function normalize_leave_request_input(
  body: unknown,
  partial = false,
): Partial<DomainRow> {
  if (!body || typeof body !== "object") {
    throw new KirletHttpError(400, "validation_error", "El cuerpo debe ser un objeto JSON");
  }
  const b = body as Record<string, unknown>;
  const out: DomainRow = {};

  if (b.employee_id !== undefined || !partial) {
    const employee_id = String(b.employee_id ?? "").trim();
    if (!employee_id && !partial) {
      throw new KirletHttpError(
        400,
        "validation_error",
        "employee_id es requerido",
        { field: "employee_id" },
      );
    }
    if (employee_id) out.employee_id = employee_id;
  }
  if (b.leave_type_id !== undefined || !partial) {
    const leave_type_id = String(b.leave_type_id ?? "").trim();
    if (!leave_type_id && !partial) {
      throw new KirletHttpError(
        400,
        "validation_error",
        "leave_type_id es requerido",
        { field: "leave_type_id" },
      );
    }
    if (leave_type_id) out.leave_type_id = leave_type_id;
  }
  if (b.start_date !== undefined || !partial) {
    const start_date = String(b.start_date ?? "").trim();
    if (!start_date && !partial) {
      throw new KirletHttpError(
        400,
        "validation_error",
        "start_date es requerido",
        { field: "start_date" },
      );
    }
    if (start_date) out.start_date = start_date;
  }
  if (b.end_date !== undefined || !partial) {
    const end_date = String(b.end_date ?? "").trim();
    if (!end_date && !partial) {
      throw new KirletHttpError(400, "validation_error", "end_date es requerido", {
        field: "end_date",
      });
    }
    if (end_date) out.end_date = end_date;
  }
  if (b.days !== undefined) {
    const days = Number(b.days);
    if (!Number.isFinite(days) || days <= 0) {
      throw new KirletHttpError(
        400,
        "validation_error",
        "days debe ser un número > 0",
        { field: "days" },
      );
    }
    out.days = days;
  }
  if (b.reason !== undefined) {
    out.reason =
      b.reason == null || b.reason === "" ? null : String(b.reason);
  }
  return out;
}

async function append_history(
  ctx: KirletCtx,
  resource: string,
  action: string,
  entity_id: string,
  payload: Record<string, unknown>,
) {
  await ctx.nox.history.append({
    resource,
    action,
    entity_id,
    actor_id: ctx.identity?.user_id ?? null,
    actor_label: ctx.actor,
    payload,
  });
}

export async function ensure_balance(
  ctx: KirletCtx,
  employee_id: string,
  leave_type_id: string,
  year: number,
): Promise<void> {
  const existing = await ctx.data.findOne("leave_balances", {
    employee_id,
    leave_type_id,
    year,
  });
  if (existing) return;

  const lt = await ctx.data.findOne("leave_types", { id: leave_type_id });
  const entitled = lt?.max_days_per_year ?? 0;
  await ctx.data.insert("leave_balances", {
    id: new_id("lb"),
    employee_id,
    leave_type_id,
    year,
    entitled_days: entitled,
    used_days: 0,
  });
}

export async function decide_leave_request(
  ctx: KirletCtx,
  action: "approve" | "reject" | "cancel",
): Promise<{ data: DomainRow }> {
  const id = ctx.params.id;
  const existing = await ctx.data.findOne("leave_requests", { id });
  if (!existing) {
    throw new KirletHttpError(404, "not_found", "not found");
  }
  const before = { ...existing };

  if (before["status"] !== "pendiente") {
    throw new KirletHttpError(
      409,
      "conflict",
      `Transición inválida: estado actual es "${before["status"]}"`,
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await ctx.body<Record<string, unknown>>()) ?? {};
  } catch {
    body = {};
  }

  const note =
    body.decision_note != null ? String(body.decision_note) : null;
  const iso = now_iso();
  const actor = ctx.actor;

  if (action === "approve") {
    const year = Number(String(before["start_date"]).slice(0, 4));
    await ensure_balance(
      ctx,
      String(before["employee_id"]),
      String(before["leave_type_id"]),
      year,
    );
    const bal = await ctx.data.findOne("leave_balances", {
      employee_id: before["employee_id"],
      leave_type_id: before["leave_type_id"],
      year,
    });

    if (bal) {
      const remaining =
        Number(bal["entitled_days"]) - Number(bal["used_days"]);
      const days = Number(before["days"]);
      if (Number(bal["entitled_days"]) > 0 && days > remaining) {
        throw new KirletHttpError(
          409,
          "conflict",
          `Saldo insuficiente: quedan ${remaining} día(s)`,
        );
      }
      await ctx.data.update(
        "leave_balances",
        { id: bal.id },
        { used_days: Number(bal["used_days"]) + days },
      );
    }

    const updated: DomainRow = {
      ...before,
      status: "aprobada",
      decided_by: actor,
      decided_at: iso,
      decision_note: note,
      updated_at: iso,
    };
    await ctx.data.update("leave_requests", { id }, {
      status: updated["status"],
      decided_by: updated["decided_by"],
      decided_at: updated["decided_at"],
      decision_note: updated["decision_note"],
      updated_at: updated["updated_at"],
    });
    await append_history(ctx, "leave_requests", "approve", id, {
      before,
      after: updated,
    });
    return { data: updated };
  }

  if (action === "reject") {
    const updated: DomainRow = {
      ...before,
      status: "rechazada",
      decided_by: actor,
      decided_at: iso,
      decision_note: note,
      updated_at: iso,
    };
    await ctx.data.update("leave_requests", { id }, {
      status: updated["status"],
      decided_by: updated["decided_by"],
      decided_at: updated["decided_at"],
      decision_note: updated["decision_note"],
      updated_at: updated["updated_at"],
    });
    await append_history(ctx, "leave_requests", "reject", id, {
      before,
      after: updated,
    });
    return { data: updated };
  }

  const updated: DomainRow = {
    ...before,
    status: "cancelada",
    decided_by: actor,
    decided_at: iso,
    decision_note: note,
    updated_at: iso,
  };
  await ctx.data.update("leave_requests", { id }, {
    status: updated["status"],
    decided_by: updated["decided_by"],
    decided_at: updated["decided_at"],
    decision_note: updated["decision_note"],
    updated_at: updated["updated_at"],
  });
  await append_history(ctx, "leave_requests", "cancel", id, {
    before,
    after: updated,
  });
  return { data: updated };
}

// --- leave-types handlers ---

export async function list_leave_types(ctx: KirletCtx) {
  if (ctx.query.get("as") === "options") {
    const rows = await ctx.data.findMany("leave_types", {
      where: { active: true },
      orderBy: { name: "asc" },
    });
    return {
      data: rows.map((r) => ({ value: r.id, label: r.name })),
    };
  }
  const lq = ctx.list_query();
  const rows = await ctx.data.findMany("leave_types", {
    orderBy: { name: "asc" },
    limit: lq.take,
    offset: lq.skip,
  });
  return { data: rows };
}

export async function get_leave_type(ctx: KirletCtx) {
  const row = await ctx.data.findOne("leave_types", { id: ctx.params.id });
  if (!row) throw new KirletHttpError(404, "not_found", "not found");
  return { data: row };
}

export async function create_leave_type(ctx: KirletCtx) {
  const input = normalize_leave_type_input(await ctx.body());
  const id = new_id("lt");
  const iso = now_iso();
  const rec: DomainRow = {
    id,
    name: input.name,
    paid: input.paid ?? 1,
    max_days_per_year: input.max_days_per_year ?? null,
    active: true,
    created_at: iso,
    updated_at: iso,
  };
  await ctx.data.insert("leave_types", rec);
  await append_history(ctx, "leave_types", "create", id, { after: rec });
  return ctx.created(rec);
}

export async function patch_leave_type(ctx: KirletCtx) {
  const id = ctx.params.id;
  const existing = await ctx.data.findOne("leave_types", { id });
  if (!existing) throw new KirletHttpError(404, "not_found", "not found");
  const input = normalize_leave_type_input(await ctx.body(), true);
  const updated: DomainRow = {
    ...existing,
    ...input,
    updated_at: now_iso(),
  };
  const { id: _id, created_at: _c, ...patch } = updated;
  await ctx.data.update("leave_types", { id }, patch);
  await append_history(ctx, "leave_types", "update", id, {
    before: existing,
    after: updated,
  });
  return { data: updated };
}

export async function delete_leave_type(ctx: KirletCtx) {
  const id = ctx.params.id;
  const existing = await ctx.data.findOne("leave_types", { id });
  if (!existing) throw new KirletHttpError(404, "not_found", "not found");
  const iso = now_iso();
  await ctx.data.update("leave_types", { id }, { active: false, updated_at: iso });
  const after = { ...existing, active: false, updated_at: iso };
  await append_history(ctx, "leave_types", "delete", id, {
    before: existing,
    after,
  });
  return { data: after };
}

// --- leave-requests handlers ---

export async function list_leave_requests(ctx: KirletCtx) {
  const lq = ctx.list_query();
  const where: Record<string, string> = {};
  const employee_id = ctx.query.get("employee_id");
  if (employee_id) where.employee_id = employee_id;
  const status = ctx.query.get("status");
  if (status) where.status = status;
  const where_opt = Object.keys(where).length ? where : undefined;
  const rows = await ctx.data.findMany("leave_requests", {
    where: where_opt,
    orderBy: { created_at: "desc" },
    limit: lq.take,
    offset: lq.skip,
  });
  return { data: rows };
}

export async function get_leave_request(ctx: KirletCtx) {
  const row = await ctx.data.findOne("leave_requests", { id: ctx.params.id });
  if (!row) throw new KirletHttpError(404, "not_found", "not found");
  return { data: row };
}

export async function create_leave_request(ctx: KirletCtx) {
  const input = normalize_leave_request_input(await ctx.body());
  const days =
    (input.days as number | undefined) ??
    compute_days(String(input.start_date), String(input.end_date));
  const id = new_id("lr");
  const iso = now_iso();
  const rec: DomainRow = {
    id,
    employee_id: input.employee_id,
    leave_type_id: input.leave_type_id,
    start_date: input.start_date,
    end_date: input.end_date,
    days,
    reason: input.reason ?? null,
    status: "pendiente",
    decided_by: null,
    decided_at: null,
    decision_note: null,
    created_at: iso,
    updated_at: iso,
  };
  await ctx.data.insert("leave_requests", rec);
  await append_history(ctx, "leave_requests", "create", id, { after: rec });
  return ctx.created(rec);
}

export async function patch_leave_request(ctx: KirletCtx) {
  const id = ctx.params.id;
  const existing = await ctx.data.findOne("leave_requests", { id });
  if (!existing) throw new KirletHttpError(404, "not_found", "not found");
  if (existing["status"] !== "pendiente") {
    throw new KirletHttpError(
      409,
      "conflict",
      "Solo se pueden editar solicitudes en estado pendiente",
    );
  }
  const input = normalize_leave_request_input(await ctx.body(), true);
  const start = String(input.start_date ?? existing["start_date"]);
  const end = String(input.end_date ?? existing["end_date"]);
  const days =
    (input.days as number | undefined) ??
    (input.start_date || input.end_date
      ? compute_days(start, end)
      : Number(existing["days"]));
  const updated: DomainRow = {
    ...existing,
    employee_id: input.employee_id ?? existing["employee_id"],
    leave_type_id: input.leave_type_id ?? existing["leave_type_id"],
    start_date: start,
    end_date: end,
    days,
    reason:
      input.reason !== undefined ? input.reason : existing["reason"],
    updated_at: now_iso(),
  };
  const { id: _id, created_at: _c, ...patch } = updated;
  await ctx.data.update("leave_requests", { id }, patch);
  await append_history(ctx, "leave_requests", "update", id, {
    before: existing,
    after: updated,
  });
  return { data: updated };
}

export async function delete_leave_request(ctx: KirletCtx) {
  const id = ctx.params.id;
  const existing = await ctx.data.findOne("leave_requests", { id });
  if (!existing) throw new KirletHttpError(404, "not_found", "not found");
  if (existing["status"] !== "pendiente") {
    throw new KirletHttpError(
      409,
      "conflict",
      "Solo se pueden eliminar solicitudes en estado pendiente",
    );
  }
  await ctx.data.delete("leave_requests", { id });
  await append_history(ctx, "leave_requests", "delete", id, {
    before: existing,
    after: null,
  });
  return { data: existing };
}

// --- leave-balances handlers ---

export async function list_leave_balances(ctx: KirletCtx) {
  const where: Record<string, string | number> = {};
  const employee_id = ctx.query.get("employee_id");
  if (employee_id) where.employee_id = employee_id;
  const year = ctx.query.get("year");
  if (year) where.year = Number(year);
  const where_opt = Object.keys(where).length ? where : undefined;
  const rows = await ctx.data.findMany("leave_balances", {
    where: where_opt,
    orderBy: { year: "desc" },
  });
  return { data: rows };
}

export async function get_leave_balance(ctx: KirletCtx) {
  const row = await ctx.data.findOne("leave_balances", { id: ctx.params.id });
  if (!row) throw new KirletHttpError(404, "not_found", "not found");
  return { data: row };
}

export async function upsert_leave_balance(ctx: KirletCtx) {
  const body = (await ctx.body<Record<string, unknown>>()) ?? {};
  const employee_id = String(body.employee_id ?? "").trim();
  const leave_type_id = String(body.leave_type_id ?? "").trim();
  const year = Number(body.year ?? new Date().getFullYear());
  const entitled_days = Number(body.entitled_days ?? 0);
  if (!employee_id || !leave_type_id) {
    throw new KirletHttpError(
      400,
      "validation_error",
      "employee_id y leave_type_id son requeridos",
    );
  }
  const existing = await ctx.data.findOne("leave_balances", {
    employee_id,
    leave_type_id,
    year,
  });

  if (existing) {
    await ctx.data.update("leave_balances", { id: existing.id }, {
      entitled_days,
    });
    const updated = { ...existing, entitled_days };
    await append_history(ctx, "leave_balances", "update", String(updated.id), {
      after: updated,
    });
    return { data: updated };
  }

  const id = new_id("lb");
  const rec: DomainRow = {
    id,
    employee_id,
    leave_type_id,
    year,
    entitled_days,
    used_days: 0,
  };
  await ctx.data.insert("leave_balances", rec);
  await append_history(ctx, "leave_balances", "create", id, { after: rec });
  return ctx.created(rec);
}

export async function patch_leave_balance(ctx: KirletCtx) {
  const id = ctx.params.id;
  const existing = await ctx.data.findOne("leave_balances", { id });
  if (!existing) throw new KirletHttpError(404, "not_found", "not found");
  const body = (await ctx.body<Record<string, unknown>>()) ?? {};
  const entitled_days =
    body.entitled_days !== undefined
      ? Number(body.entitled_days)
      : Number(existing["entitled_days"]);
  const used_days =
    body.used_days !== undefined
      ? Number(body.used_days)
      : Number(existing["used_days"]);
  await ctx.data.update("leave_balances", { id }, {
    entitled_days,
    used_days,
  });
  const updated = { ...existing, entitled_days, used_days };
  await append_history(ctx, "leave_balances", "update", id, {
    before: existing,
    after: updated,
  });
  return { data: updated };
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion LEAVE WORKFLOW SERVICE
// (o==================================================================o)
