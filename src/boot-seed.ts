// (o==================================================================o)
//   #region DEFERRED SEED (HTTP mode waits for NOX schema apply)
// (o-----------------------------------------------------------\/-----o)

import { resolve_data_mode } from "@opus-perpetuus/kirel-nox-kit";
import { seed_leave_types, seed_demo } from "./seed.ts";
import { get_seed_demo } from "./config.ts";

/**
 * Seed domain rows via kit client.
 * In HTTP (NOX) mode, tables exist only AFTER NOX applies GET /schema —
 * which happens after container /health succeeds. So boot must listen first
 * and seed in the background with retries.
 */
export async function run_seed_once(): Promise<{
  leave_types: boolean;
  demo: Awaited<ReturnType<typeof seed_demo>> | null;
}> {
  await seed_leave_types();
  let demo: Awaited<ReturnType<typeof seed_demo>> | null = null;
  if (get_seed_demo()) {
    demo = await seed_demo();
  }
  return { leave_types: true, demo };
}

export async function seed_with_retry(opts?: {
  attempts?: number;
  delay_ms?: number;
}): Promise<void> {
  const attempts = opts?.attempts ?? (resolve_data_mode() === "http" ? 30 : 1);
  const delay_ms = opts?.delay_ms ?? 1000;
  let last_err: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await run_seed_once();
      if (result.demo && result.demo.employees > 0) {
        console.log(
          JSON.stringify({
            level: "info",
            msg: "seed_demo",
            attempt: i + 1,
            ...result.demo,
          }),
        );
      } else {
        console.log(
          JSON.stringify({
            level: "info",
            msg: "seed_ok",
            attempt: i + 1,
            mode: resolve_data_mode(),
          }),
        );
      }
      return;
    } catch (err) {
      last_err = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        JSON.stringify({
          level: "warn",
          msg: "seed_retry",
          attempt: i + 1,
          attempts,
          error: msg.slice(0, 300),
        }),
      );
      if (i + 1 < attempts) {
        await Bun.sleep(delay_ms);
      }
    }
  }
  console.error(
    JSON.stringify({
      level: "error",
      msg: "seed_failed",
      error:
        last_err instanceof Error ? last_err.message : String(last_err ?? ""),
    }),
  );
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DEFERRED SEED
// (o==================================================================o)
