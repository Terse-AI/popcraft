# PopCraft

An open-world voxel sandbox that runs **entirely in the browser** — no install, no plugins, desktop and mobile. Infinite procedurally-generated terrain you can mine, build and explore, with a stylized shader-pack look.

Play the character **Lumi**, a little lantern-carrying mascot, across an endless block world.

## Features

- **Infinite procedural world** — chunked terrain streamed on web workers, 17 biomes (plains, forest, cherry grove, desert, badlands, taiga, jungle, savanna, snow peaks, swamp, rivers…), caves, ores by depth, and rivers that run to the sea.
- **Mine · build · craft** — break blocks, collect drops, 33 crafting recipes (planks, tools, bricks, glass, wool, lamps…), ~86 block types.
- **Creatures** — shades that burn in daylight, bouncing slimes that split, cloud rabbits. Day/night cycle and weather (rain and snow by biome).
- **Stylized realistic rendering** — a physically-based scattering sky (Preetham), normal-mapped block surfaces, per-family procedural textures, soft sun shadows, screen-space ambient occlusion, volumetric light shafts, water that reflects the sky, waving grass and foliage, bloom and filmic grading.
- **Controls like you'd expect** — WASD + mouse, sneak (won't walk off ledges), sprint, F5 camera modes, a hotbar, and full touch controls on phones.

Everything — every model, texture and terrain — is generated in code. No downloaded art assets.

## Tech

- Pure **Three.js (r0.158)** on WebGL2, a single self-contained HTML file.
- Terrain generation, lighting and greedy meshing run on a **web-worker pool**, with a main-thread fallback.
- Custom chunk/sky/water shaders; a hand-rolled post-processing chain (bright-pass bloom, SSAO, outline, god rays, FXAA, grade).

## Run locally

```bash
npm start      # serves on http://localhost:3000
```

Or just open `index.html` in a browser — it needs no build step.

## Deploy

The repo is Railway-ready: `npm start` runs a zero-dependency static server on `$PORT`. Connect the repo in Railway and it deploys as-is.
