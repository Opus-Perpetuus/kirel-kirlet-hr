import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { KIRLET } from "../src/kirlet.ts";

const out_dir = join(import.meta.dir, "..", "mobile");
mkdirSync(out_dir, { recursive: true });

const manifest = KIRLET.manifest();
// Definition input is the source of truth: a stale kit dist may drop widgets
// from the validated manifest while `input.widgets` is still the authored set.
const authored = KIRLET.input.widgets ?? manifest.widgets ?? [];
const local_widgets = authored.filter((w) => w.capability !== "backend-only");
const page_ids = new Set(local_widgets.map((w) => w.pageId).filter(Boolean) as string[]);

const stub = {
  url: null,
  identity: null,
  data: {} as never,
  nox: {} as never,
  files: {} as never,
};

const pages: Record<string, unknown> = {};
for (const mod of KIRLET.modules) {
  for (const page of mod.pages ?? []) {
    if (!page_ids.has(page.id)) continue;
    pages[page.id] = await page.build(stub);
  }
}

const pack = {
  technicalId: manifest.technicalId,
  catalogId: manifest.id,
  name: manifest.name,
  version: manifest.version,
  localFunctions: {
    widgets: local_widgets,
    pages,
  },
};

const out = join(out_dir, "local-pack.json");
writeFileSync(out, JSON.stringify(pack, null, 2) + "\n");
console.log(`wrote ${out} widgets=${local_widgets.length} pages=${Object.keys(pages).length}`);
