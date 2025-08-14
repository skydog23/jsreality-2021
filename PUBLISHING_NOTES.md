### Packaging jsreality math (for later publishing)

Recommended: ESM-first npm package exposing P2, P3, Pn, Rn.

1) package.json (key points)
```
{
  "name": "@your-scope/jsreality-math",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./index.js",
    "./P2.js": "./P2.js",
    "./P3.js": "./P3.js",
    "./Pn.js": "./Pn.js",
    "./Rn.js": "./Rn.js"
  },
  "files": ["*.js", "dist/*"],
  "sideEffects": false
}
```

2) index.js
```
export * as Rn from './Rn.js';
export * as Pn from './Pn.js';
export * as P3 from './P3.js';
export * as P2 from './P2.js';
```

3) Types (optional)
- Generate .d.ts from JSDoc: add a tsconfig with `allowJs: true`, `declaration: true`, `emitDeclarationOnly: true`, `outDir: dist` and run `tsc`.
- Add `"types": "dist/index.d.ts"` to package.json.

4) Consumption (after publish)
- `npm i @your-scope/jsreality-math`
- `import * as Rn from '@your-scope/jsreality-math/Rn.js'` or `import { Rn, Pn } from '@your-scope/jsreality-math'`.

5) Alternative local dev (monorepo)
- Use a workspace (npm/pnpm/yarn) so conics depends on the local package by name, with version symlinked during dev.
