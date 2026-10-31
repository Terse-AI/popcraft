#!/bin/bash
# StarVale ships inside NOVA: copies the game into game/ next to server.js. Run from the folder that gets deployed.
SRC="${1:-../popcraft}"
mkdir -p game && rsync -a --delete --exclude='.git' --exclude='nova' --exclude='tools' --exclude='mc.html' --exclude='server.js' --exclude='package.json' --exclude='railway.json' --exclude='*.md' "$SRC"/ game/
