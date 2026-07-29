/** standard-version updater: whole file is the version string + newline. */
module.exports.readVersion = function readVersion(contents) {
  return String(contents || "").trim();
};
module.exports.writeVersion = function writeVersion(_contents, version) {
  return `${version}\n`;
};
