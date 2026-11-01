# Rule tests

The game's rules run in Node with the drawing modules stubbed out.

```bash
cd test && npm install && npm test
```

`run.mjs` copies `data.js`, `valley.js`, `systems.js` and `late.js` into `.build/` beside the stand-ins in `stubs/`, then runs `tests.mjs`. `check_data.mjs` confirms every item a recipe, machine or building names exists.
