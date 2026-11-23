#!/usr/bin/env bash
# Bygger forhåndsvisningen (preview/) som publiseres som privat artifact på claude.ai:
# et utvalg sider med relative lenker, uten server. Selve nettstedet bygges med «npm run build».
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .preview-build
BASE=/hpgt/ OUT=.preview-build/hpgt npx astro build >/dev/null
python3 -I scripts/make-preview.py .preview-build preview
