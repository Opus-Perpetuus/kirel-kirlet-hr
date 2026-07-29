#!/usr/bin/env bash
# Called from standard-version postbump so NOX catalog install pins
# always match this kirlet's VERSION / image after release.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NOX="$(cd "$ROOT/../kirel-nox" && pwd)"
cd "$ROOT"
VERSION="$(tr -d '[:space:]' < VERSION)"
IMAGE="$(tr -d '[:space:]' < IMAGE.txt 2>/dev/null || echo "kyostenas/kirlet-hr:${VERSION}")"
# Ensure IMAGE.txt tracks the new version
echo "kyostenas/kirlet-hr:${VERSION}" > IMAGE.txt
bun "$NOX/scripts/pin-kirlet-catalog.ts" \
  --from-kirlet-dir="$ROOT"
echo "sync-nox-catalog-pin: kirlet-hr@${VERSION} → NOX DEFAULT_CATALOG"
