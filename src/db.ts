// (o==================================================================o)
//   #region DATA (kit re-export — no private domain DB)
// (o-----------------------------------------------------------\/-----o)

/**
 * Domain data is kit-mediated (Memory / HTTP to NOX shared Postgres).
 * Import from `./data/bootstrap.ts` for new code.
 */

export {
  get_data,
  init_data,
  reset_data_for_tests,
  close_data,
  repo,
} from "./data/bootstrap.ts";

// (o-----------------------------------------------------------/\-----o)
//   #endregion DATA
// (o==================================================================o)
