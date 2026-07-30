import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { close_hr_app, reset_hr_app_for_tests } from "./app/hr-app.ts";
import { run_seed_once, seed_with_retry } from "./boot-seed.ts";
import { get_data } from "./data/bootstrap.ts";
import { boot } from "./server.ts";

describe("boot seed order (shipped)", () => {
  beforeEach(() => {
    delete process.env.NOX_DATA_URL;
    delete process.env.NOX_KIRLET_GATEWAY_SECRET;
    reset_hr_app_for_tests();
  });
  afterEach(() => {
    close_hr_app();
  });

  test("run_seed_once populates leave_types via kit client", async () => {
    await run_seed_once();
    const n = await get_data().count("leave_types");
    expect(n).toBeGreaterThan(0);
  });

  test("boot({listen:false}) seeds memory without hang", async () => {
    process.env.DATA_DIR = `/tmp/grok-goal-37187531b399/implementer/hr-boot-${Date.now()}`;
    close_hr_app();
    // boot() re-inits via init_hr_app → init_data (memory)
    await boot({ listen: false });
    const n = await get_data().count("leave_types");
    expect(n).toBeGreaterThan(0);
    delete process.env.DATA_DIR;
  });


  test("seed_with_retry is idempotent on memory", async () => {
    await seed_with_retry({ attempts: 2, delay_ms: 5 });
    await seed_with_retry({ attempts: 1 });
    expect(await get_data().count("leave_types")).toBeGreaterThan(0);
  });
});

