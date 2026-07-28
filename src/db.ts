// (o==================================================================o)
//   #region DATABASE
// (o-----------------------------------------------------------\/-----o)

import { Database } from "bun:sqlite";
import { mkdirSync, readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { get_db_path, get_data_dir, get_files_dir } from "./config.ts";

let db: Database | null = null;

export function get_db(): Database {
  if (!db) throw new Error("Database not initialized — call open_db() first");
  return db;
}

export function open_db(db_path = get_db_path()): Database {
  mkdirSync(dirname(db_path), { recursive: true });
  mkdirSync(get_data_dir(), { recursive: true });
  mkdirSync(get_files_dir(), { recursive: true });

  const instance = new Database(db_path, { create: true });
  instance.exec("PRAGMA journal_mode = WAL;");
  instance.exec("PRAGMA foreign_keys = ON;");
  db = instance;
  return instance;
}

export function close_db(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/** Apply SQL migrations from src/migrations once. */
export function run_migrations(instance?: Database): string[] {
  const conn = instance ?? get_db();
  conn.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const migrations_dir = join(import.meta.dir, "migrations");
  if (!existsSync(migrations_dir)) {
    return [];
  }

  const files = readdirSync(migrations_dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = new Set(
    (
      conn
        .query("SELECT name FROM _migrations ORDER BY name")
        .all() as Array<{ name: string }>
    ).map((r) => r.name),
  );

  const newly: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(migrations_dir, file), "utf8");
    // Skip the _migrations create in the migration body (already ensured)
    const body = sql
      .split("\n")
      .filter((line) => !line.includes("CREATE TABLE IF NOT EXISTS _migrations"))
      .join("\n");
    conn.exec("BEGIN;");
    try {
      if (body.trim()) conn.exec(body);
      conn
        .query("INSERT INTO _migrations (name) VALUES (?)")
        .run(file);
      conn.exec("COMMIT;");
      newly.push(file);
    } catch (err) {
      conn.exec("ROLLBACK;");
      throw err;
    }
  }
  return newly;
}

/** Open + migrate for tests or server boot. */
export function init_db(db_path = get_db_path()): Database {
  const conn = open_db(db_path);
  run_migrations(conn);
  return conn;
}

// (o-----------------------------------------------------------/\-----o)
//   #endregion DATABASE
// (o==================================================================o)
