// (o==================================================================o)
//   #region CONFIG
// (o-----------------------------------------------------------\/-----o)

export function get_port(): number {
  return Number(process.env.PORT ?? 3000);
}

export function get_technical_id(): string {
  return process.env.KIRLET_TECHNICAL_ID ?? "kirlet-hr";
}

export function get_data_dir(): string {
  return process.env.DATA_DIR ?? "/data";
}

export function get_seed_demo(): boolean {
  return (
    process.env.KIRLET_SEED_DEMO === "1" ||
    process.env.KIRLET_SEED_DEMO === "true"
  );
}

export function get_gateway_secret(): string {
  return process.env.NOX_KIRLET_GATEWAY_SECRET ?? "";
}

/** `off` = standalone dev (no signature). Default: on. */
export function get_kirlet_auth(): string {
  return (process.env.KIRLET_AUTH ?? "on").toLowerCase();
}

export function is_auth_disabled(): boolean {
  const v = get_kirlet_auth();
  return v === "off" || v === "false" || v === "0";
}

export function get_api_base(): string {
  return `api://m/${get_technical_id()}`;
}

export function get_files_dir(): string {
  return `${get_data_dir()}/files`;
}

export function get_db_path(): string {
  return `${get_data_dir()}/hr.db`;
}

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const HISTORY_CAP_PER_RESOURCE = 5000;

// Back-compat constants (evaluated lazily via getters in consumers that import names)
export const PORT = Number(process.env.PORT ?? 3000);
export const KIRLET_TECHNICAL_ID =
  process.env.KIRLET_TECHNICAL_ID ?? "kirlet-hr";
export const DATA_DIR = process.env.DATA_DIR ?? "/data";
export const KIRLET_SEED_DEMO =
  process.env.KIRLET_SEED_DEMO === "1" ||
  process.env.KIRLET_SEED_DEMO === "true";
export const NOX_KIRLET_GATEWAY_SECRET =
  process.env.NOX_KIRLET_GATEWAY_SECRET ?? "";
export const KIRLET_AUTH = (process.env.KIRLET_AUTH ?? "on").toLowerCase();
export const AUTH_DISABLED =
  KIRLET_AUTH === "off" || KIRLET_AUTH === "false" || KIRLET_AUTH === "0";
export const API_BASE = `api://m/${KIRLET_TECHNICAL_ID}`;
export const FILES_DIR = `${DATA_DIR}/files`;
export const DB_PATH = `${DATA_DIR}/hr.db`;

// (o-----------------------------------------------------------/\-----o)
//   #endregion CONFIG
// (o==================================================================o)
