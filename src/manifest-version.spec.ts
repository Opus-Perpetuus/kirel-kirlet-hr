// (o==================================================================o)
//   #region MANIFEST VERSION (no drift against package.json)
// (o-----------------------------------------------------------\/-----o)

import { describe, expect, test } from "bun:test";
import pkg from "../package.json" with { type: "json" };
import { KIRLET } from "./kirlet.ts";

describe("manifest version", () => {
  test("version and image derive from package.json", () => {
    const manifest = KIRLET.manifest();
    expect(manifest.version).toBe(pkg.version);
    expect(manifest.image).toBe(`kyostenas/kirlet-hr:${pkg.version}`);
  });
});

// (o-----------------------------------------------------------/\-----o)
//   #endregion MANIFEST VERSION
// (o==================================================================o)
