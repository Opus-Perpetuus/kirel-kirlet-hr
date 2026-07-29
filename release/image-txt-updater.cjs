/** standard-version updater for IMAGE.txt (`repo:version`). */
module.exports.readVersion = function readVersion(contents) {
  const line = String(contents || "").trim();
  const i = line.lastIndexOf(":");
  return i >= 0 ? line.slice(i + 1) : line;
};
module.exports.writeVersion = function writeVersion(contents, version) {
  const line = String(contents || "").trim();
  const i = line.lastIndexOf(":");
  const base = i >= 0 ? line.slice(0, i) : "kyostenas/kirlet-hr";
  return `${base}:${version}\n`;
};
