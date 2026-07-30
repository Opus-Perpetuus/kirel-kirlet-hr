import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { KIRLET } from "../src/kirlet.ts";

const out = join(import.meta.dir, "..", "manifest.json");
writeFileSync(out, JSON.stringify(KIRLET.manifest(), null, 2) + "\n");
console.log(`wrote ${out}`);
