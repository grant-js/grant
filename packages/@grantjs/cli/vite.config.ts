import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as {
  version: string;
};

export default defineConfig({
  define: {
    __GRANT_CLI_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    dts({
      include: ['src/**/*'],
      // Matches @grantjs/client and @grantjs/server. Redundant today -- this package's
      // tsconfig.build.json already excludes *.test.ts, and dist/ carries no test
      // declarations without it -- but the guarantee then rests on which tsconfig the
      // plugin happens to read. Stating it here makes the two mechanisms agree, so a
      // new package copied from this config cannot ship its tests.
      exclude: ['src/**/*.{test,spec}.ts'],
      tsconfigPath: './tsconfig.build.json',
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'GrantCLI',
      formats: ['es'],
      fileName: () => 'index.mjs',
    },
    rollupOptions: {
      external: (id) => id.startsWith('node:') || builtinModules.includes(id) || id === 'inquirer',
      output: {
        format: 'es',
        inlineDynamicImports: true,
      },
    },
    sourcemap: true,
    minify: false,
    target: 'node18',
    outDir: 'dist',
    emptyDirBeforeWrite: true,
  },
});
