/**
 * Bundles the API server entry into a single ESM file for the Lambda target.
 *
 * Why this exists: on Lambda the process is started fresh on every cold start, so
 * module *resolution* — walking node_modules, stat-ing candidate paths, reading and
 * linking ~2,000 files — is paid per cold start rather than once per pod. Measured on
 * the shipped container, collapsing that into one file cut the import phase of
 * `create-app` from ~2,470 ms to ~1,090 ms (56%).
 *
 * This is additive. `tsc` still produces `apps/api/dist`, and the Kubernetes and
 * Compose images still run it; only the `runner-lambda` stage runs this output.
 * Anything the bundle cannot express is listed in EXTERNALS below and loaded from
 * the same pruned node_modules the other images use.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const API_DIR = join(ROOT, 'apps/api');

/**
 * Packages that must NOT be inlined. Each entry is here because bundling it was
 * observed to break, not on suspicion — an unnecessary external costs cold-start
 * time, which is the thing this script exists to buy back.
 */
export const EXTERNALS = [
  // Native addon: the bundler would inline the JS wrapper and leave the .node
  // binding unresolvable. Observed as "No native build was found for
  // platform=linux ... libc=musl" at first call.
  'bcrypt',

  // OpenTelemetry patches its targets by intercepting module loads. Inlining it
  // removes the load events it hooks, so auto-instrumentation would silently stop
  // producing spans; @opentelemetry/core also fails outright, doing a CJS
  // `require('util')` that cannot be statically resolved into ESM output.
  '@opentelemetry/*',

  // pino spawns its transports as worker threads, and thread-stream locates the
  // worker file with __dirname — which has no meaning in ESM output. Observed as
  // "ReferenceError: __dirname is not defined in ES module scope" the first time a
  // logger is constructed, i.e. before anything else in the process runs.
  'pino',

  // swagger-ui-express serves swagger-ui-dist's static assets, locating them with
  // `path.resolve(__dirname)`. The assets are real files on disk that no bundle can
  // inline, so the package has to keep its own location.
  'swagger-ui-express',
];

/**
 * esbuild's ESM output throws on any unresolved `require()`. Several production
 * CommonJS dependencies call it lazily, so give the bundle a real one — esbuild's
 * own shim defers to a global `require` when one is defined.
 */
const REQUIRE_BANNER = [
  "import{createRequire as __grantCreateRequire}from'node:module';",
  'const require=__grantCreateRequire(import.meta.url);',
].join('');

function readApiVersion() {
  const pkg = JSON.parse(readFileSync(join(API_DIR, 'package.json'), 'utf8'));
  const version = pkg.version?.trim();
  if (!version) {
    throw new Error('apps/api/package.json has no version to inline');
  }
  return version;
}

async function main() {
  const version = readApiVersion();
  const outfile = join(API_DIR, 'dist-lambda/server.mjs');

  console.log(`\n[bundle-api-lambda] Bundling apps/api/src/server.ts (version ${version})...`);

  const result = await build({
    entryPoints: [join(API_DIR, 'src/server.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    tsconfig: join(API_DIR, 'tsconfig.json'),
    external: EXTERNALS,
    banner: { js: REQUIRE_BANNER },
    // Read at build time so the bundle needs no path back to apps/api/package.json,
    // which it can no longer reach relative to its own location.
    define: { __GRANT_PLATFORM_VERSION__: JSON.stringify(version) },
    logLevel: 'warning',
    metafile: true,
  });

  const bytes = Object.values(result.metafile.outputs).reduce((sum, o) => sum + o.bytes, 0);
  console.log(`[bundle-api-lambda] Wrote ${outfile} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
}

// Only build when invoked as a command. Importing this module (the contract test
// does) must not kick off a 27 MB bundle.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('[bundle-api-lambda] Failed:', error);
    process.exit(1);
  });
}
