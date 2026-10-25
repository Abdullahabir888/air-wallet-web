// Bundles Functions + the shared workspace packages into lib/index.js.
// Firebase uploads only this folder, so shared code must be inlined at build time.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.join(here, 'src/index.ts')],
  outfile: path.join(here, 'lib/index.js'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: true,
  external: ['firebase-admin', 'firebase-functions'],
  alias: {
    '@air-wallet/core': path.join(here, '../packages/core/src/index.ts'),
    '@air-wallet/validation': path.join(here, '../packages/validation/src/index.ts'),
  },
  nodePaths: [path.join(here, 'node_modules')],
  logLevel: 'info',
});
