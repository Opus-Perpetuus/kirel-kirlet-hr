/**
 * Custom standard-version config for KIRLET-hr.
 * Extend types via types.extra.json without changing this file.
 */
const fs = require("node:fs");
const path = require("node:path");

function loadTypes(file) {
  const p = path.join(__dirname, file);
  if (!fs.existsSync(p)) return [];
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  if (!Array.isArray(raw)) {
    throw new Error(`${file} must be a JSON array`);
  }
  return raw;
}

const base = loadTypes("types.base.json");
const extra = loadTypes("types.extra.json");
const byType = new Map();
for (const t of base) byType.set(t.type, t);
for (const t of extra) byType.set(t.type, t);

module.exports = {
  types: [...byType.values()],
  releaseCommitMessageFormat: "chore(release): {{currentTag}}",
  packageFiles: [{ filename: "package.json", type: "json" }],
  bumpFiles: [
    { filename: "package.json", type: "json" },
    { filename: "manifest.json", type: "json" },
  ],
  scripts: {
    postbump:
      "node -e \"const fs=require('fs'); const v=require('./package.json').version; fs.writeFileSync('VERSION', v+'\\n'); const m=JSON.parse(fs.readFileSync('manifest.json','utf8')); m.version=v; m.image='kyostenas/kirlet-hr:'+v; fs.writeFileSync('manifest.json', JSON.stringify(m,null,2)+'\\n');\"",
  },
  header:
    "# Changelog\n\nKIRLET-hr release notes. Types: `release/types.base.json` + `types.extra.json`.\n",
};
