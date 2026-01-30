import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { resolve, dirname } from 'node:path';
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
