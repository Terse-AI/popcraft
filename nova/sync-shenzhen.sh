#!/bin/bash
# 深圳生活 ships inside NOVA too: copies the built app (ShenzhenLife/shenzhen, after shopint_tools/build_app.py) into shenzhen/
# next to server.js. Run from the folder that gets deployed. (macOS rsync has no '***', so directories are copied whole.)
SRC="${1:-$HOME/Desktop/ShenzhenLife/shenzhen}"
set -e
[ -f "$SRC/app.html" ] || { echo "no $SRC/app.html — run shopint_tools/build_app.py first"; exit 1; }
rm -rf shenzhen && mkdir -p shenzhen/tiles
for f in szdata2.js real_palette.js real_shopdata.js real_shoppal.js real_shopapp.js real_shopint3.js real_shopint4.js real_shopint5.js real_shopint6.js real_appmode.js real_explore.js; do cp "$SRC/$f" shenzhen/; done
cp "$SRC"/tiles/t_* shenzhen/tiles/
for d in far roofs tex; do cp -RL "$SRC/$d" shenzhen/; done   # these are symlinks in the source tree
cp "$SRC/app.html" shenzhen/index.html
echo "shenzhen/: $(find shenzhen -type f | wc -l | tr -d ' ') files, $(du -sh shenzhen | cut -f1)"
