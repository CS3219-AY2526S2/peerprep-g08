// lib0@0.2.117 ships type definitions for several modules but omits the
// corresponding .js ESM files from its build output, even though its own
// exports map declares them.  yjs imports these subpaths and Node.js v22
// requires every exports-map entry to resolve to a real file.
//
// This script creates lightweight re-export shims for every missing file
// so the collab-service starts correctly after a clean npm install.

import { writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const lib0Dir = fileURLToPath(
  new URL("../node_modules/lib0", import.meta.url)
);

// Map of missing_module → { cjs: 'dist/xxx.cjs', exports: ['a','b',...] }
// Each entry is built by requiring the .cjs file and reading its keys.
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const missing = ["buffer", "error", "environment"];

let patched = 0;
for (const mod of missing) {
  const shimPath = path.join(lib0Dir, `${mod}.js`);
  if (existsSync(shimPath)) continue;

  const cjsPath = path.join(lib0Dir, "dist", `${mod}.cjs`);
  const exports = Object.keys(require(cjsPath));

  const lines = [
    `// Auto-generated shim — see scripts/patch-lib0.mjs`,
    `export {`,
    ...exports.map((e) => `  ${e},`),
    `} from './dist/${mod}.cjs';`,
    "",
  ].join("\n");

  writeFileSync(shimPath, lines);
  console.log(`✔  Patched lib0/${mod}.js`);
  patched++;
}

if (patched === 0) {
  console.log("✔  lib0 shims already present, nothing to patch");
}
