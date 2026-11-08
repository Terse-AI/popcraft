#!/bin/bash
# 深圳生活 ships inside NOVA too: copies the built app (ShenzhenLife/shenzhen, after shopint_tools/build_app.py) into shenzhen/
# next to server.js. Run from the folder that gets deployed. (macOS rsync has no '***', so directories are copied whole.)
SRC="${1:-$HOME/Desktop/ShenzhenLife/shenzhen}"
set -e
[ -f "$SRC/app.html" ] || { echo "no $SRC/app.html — run shopint_tools/build_app.py first"; exit 1; }
rm -rf shenzhen && mkdir -p shenzhen/tiles
# every local script app.html loads (so a new module can never be left behind and 404 live)
for f in $(grep -o '<script src="[^":]*"' "$SRC/app.html" | sed 's/<script src="//;s/"$//;s/?.*//' | sort -u); do cp "$SRC/$f" shenzhen/; done
cp "$SRC"/tiles/t_* shenzhen/tiles/
for d in far roofs tex; do cp -RL "$SRC/$d" shenzhen/; done   # these are symlinks in the source tree
cp "$SRC/app.html" shenzhen/index.html
echo "shenzhen/: $(find shenzhen -type f | wc -l | tr -d ' ') files, $(du -sh shenzhen | cut -f1)"
