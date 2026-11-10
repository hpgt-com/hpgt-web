#!/usr/bin/env bash
# Bygger forhåndsvisningen (forhandsvisning/) som publiseres som privat artifact på claude.ai:
# et utvalg sider med relative lenker, uten server. Selve nettstedet bygges med «npm run build».
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .forhandsvisning-bygg
BASE=/hpgt/ OUT=.forhandsvisning-bygg/hpgt npx astro build >/dev/null
python3 -I scripts/lag-forhandsvisning.py .forhandsvisning-bygg forhandsvisning
