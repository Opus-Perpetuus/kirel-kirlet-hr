// (o==================================================================o)
//   #region DATA BOOTSTRAP (kit client — no private DB)
// (o-----------------------------------------------------------\/-----o)

import {
  HttpKirletDataClient,
  MemoryKirletDataClient,
  KirletRepository,
  resolve_data_mode,
  type KirletDataClient,
  type DomainRow,
} from "@opus-perpetuus/kirel-nox-kit";
import { HR_SCHEMA } from "../schema/hr.schema.ts";
import { get_technical_id } from "../config.ts";
import { mkdirSync } from "node:fs";
import { get_data_dir, get_files_dir } from "../config.ts";

let client: KirletDataClient | null = null;

export function get_data(): KirletDataClient {
  if (!client) {
    throw new Error("Data client not initialized — call init_data() first");
  }
  return client;
}

export function repo<T extends DomainRow = DomainRow>(
  table: string,
): KirletRepository<T> {
  return new KirletRepository<T>(get_data(), table);
}

/**
 * Init kit data client.
 * - With NOX_DATA_URL + gateway secret → HTTP to NOX (production Docker).
 * - Otherwise Memory store (tests / standalone) — same schema tables, no SQL file.
 * Never opens bun:sqlite or a private domain DB file.
 */
export function init_data(): KirletDataClient {
  mkdirSync(get_data_dir(), { recursive: true });
  mkdirSync(get_files_dir(), { recursive: true });

  const mode = resolve_data_mode();
  if (mode === "http") {
    client = new HttpKirletDataClient({
      baseUrl: process.env.NOX_DATA_URL!,
      technicalId: get_technical_id(),
      gatewaySecret: process.env.NOX_KIRLET_GATEWAY_SECRET!,
    });
  } else {
    client = new MemoryKirletDataClient(HR_SCHEMA);
  }
  return client;
}

export function reset_data_for_tests(): MemoryKirletDataClient {
  const mem = new MemoryKirletDataClient(HR_SCHEMA);
  client = mem;
  return mem;
}

export function close_data(): void {
  client = null;
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DATA BOOTSTRAP
// (o==================================================================o)
