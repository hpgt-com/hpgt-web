#!/usr/bin/env bash
# Bygger alle fem designprototypene side om side i prototyper/<navn>/ med en oversiktsside på roten.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf prototyper && mkdir -p prototyper
for t in fjordpluss fjord pico magasin klassisk nordlys; do
  THEME=$t BASE=/$t/ OUT=prototyper/$t npx astro build >/dev/null
  echo "bygget $t"
done
cp scripts/prototyper.html prototyper/index.html
cp public/robots.txt prototyper/robots.txt
