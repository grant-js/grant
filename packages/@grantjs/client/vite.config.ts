import { resolve } from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/__tests__/**'],
      tsconfigPath: './tsconfig.build.json',
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        react: resolve(__dirname, 'src/react/index.ts'),
      },
      name: 'GrantClient',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        const ext = format === 'es' ? 'mjs' : 'cjs';
        return `${entryName}.${ext}`;
      },
    },
    rollupOptions: {
      // Externalize deps that shouldn't be bundled
      external: ['react', 'react/jsx-runtime', '@grantjs/schema', '@tanstack/react-query'],
      output: {
        // Global vars for UMD build
        globals: {
          react: 'React',
          'react/jsx-runtime': 'jsxRuntime',
          '@grantjs/schema': 'GrantSchema',
          '@tanstack/react-query': 'ReactQuery',
        },
        // Preserve module structure for tree-shaking
        preserveModules: false,
      },
    },
    sourcemap: true,
    minify: false, // Keep readable for debugging
    target: 'es2020',
    outDir: 'dist',
    emptyDirBeforeWrite: true,
  },
  resolve: {
    alias: {
      '@grantjs/schema': resolve(__dirname, '../schema/src/index.ts'),
    },
  },
  // Vitest configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/__tests__/**'],
    },
  },
});
