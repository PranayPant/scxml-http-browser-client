/**
 * Build script for scxml-http-browser-client.
 *
 * Produces dual CommonJS/ESM output plus TypeScript declarations:
 *   - dist/index.js   -> CommonJS (bundled with esbuild)
 *   - dist/index.mjs  -> ESM      (bundled with esbuild)
 *   - dist/index.d.ts -> TypeScript declarations (compiled with tsc)
 *
 * Bundling inlines all internal relative imports, so the ESM output is a
 * single self-contained file that Node ESM can load without extension
 * resolution issues. Cross-platform: works on Windows, macOS, and Linux.
 */
import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const entry = join(root, 'src', 'index.ts');

// 1. Clean previous build artifacts
rmSync(join(root, 'dist'), { recursive: true, force: true });

// 2. Bundle CommonJS
await build({
  entryPoints: [entry],
  outfile: join(root, 'dist', 'index.js'),
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2020',
  sourcemap: false,
});

// 3. Bundle ESM
await build({
  entryPoints: [entry],
  outfile: join(root, 'dist', 'index.mjs'),
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2020',
  sourcemap: false,
});

// 4. Generate TypeScript declarations
execSync('npx tsc --emitDeclarationOnly --outDir dist', {
  cwd: root,
  stdio: 'inherit',
});