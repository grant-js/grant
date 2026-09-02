/**
 * The Lambda bundle is a *second* build of the same app, and these tests exist to
 * keep it second: the Kubernetes and Compose images must keep running the `tsc`
 * output, and every package the bundle refuses to inline must still be resolvable
 * at runtime.
 *
 * Both failures this guards against are silent at build time. An external that is
 * not a declared dependency bundles and ships fine, then throws
 * ERR_MODULE_NOT_FOUND on the first cold start; a CMD edit in the wrong stage
 * redirects the K8s image without any test noticing.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(import.meta.dirname, '../../../../..');

// Imported by computed path: the bundler lives outside apps/api's rootDir, so a
// static specifier would pull it into this package's TypeScript program.
const { EXTERNALS } = (await import(
  pathToFileURL(resolve(REPO_ROOT, 'scripts/docker/bundle-api-lambda.mjs')).href
)) as { EXTERNALS: readonly string[] };
const dockerfile = readFileSync(resolve(REPO_ROOT, 'apps/api/Dockerfile'), 'utf-8');
const apiPkg = JSON.parse(readFileSync(resolve(REPO_ROOT, 'apps/api/package.json'), 'utf-8')) as {
  dependencies: Record<string, string>;
};

/** The Dockerfile text from `FROM ... AS <name>` up to the next stage. */
function stage(name: string): string {
  const start = dockerfile.indexOf(`AS ${name}\n`);
  expect(start, `stage ${name} is missing`).toBeGreaterThan(-1);
  const next = dockerfile.indexOf('\nFROM ', start);
  return dockerfile.slice(start, next === -1 ? undefined : next);
}

describe('every bundle external is resolvable at runtime', () => {
  /**
   * esbuild happily marks a package external whether or not it can be found later.
   * Node resolves it from the bundle's directory upward, which reaches apps/api's
   * own dependencies — so an external that only exists as a transitive dependency
   * of a workspace package resolves in the image (which hoists) and nowhere else.
   * `pino` was exactly that case.
   */
  it.each(EXTERNALS.filter((name) => !name.includes('*')))(
    '%s is a declared dependency of apps/api',
    (name) => {
      expect(Object.keys(apiPkg.dependencies)).toContain(name);
    }
  );

  it('declares at least one dependency for each wildcard external', () => {
    const wildcards = EXTERNALS.filter((name) => name.includes('*'));
    for (const pattern of wildcards) {
      const prefix = pattern.replace('*', '');
      const matches = Object.keys(apiPkg.dependencies).filter((dep) => dep.startsWith(prefix));
      expect(matches.length, `nothing matches ${pattern}`).toBeGreaterThan(0);
    }
  });
});

describe('the bundle is additive', () => {
  it('leaves the default runtime on the tsc output', () => {
    expect(stage('runner')).toContain('CMD ["node", "dist/server.js"]');
  });

  it('keeps `default` pointing at runner, so `docker build` is unchanged', () => {
    expect(dockerfile.trimEnd().endsWith('FROM runner AS default')).toBe(true);
  });

  it('runs esbuild only in the bundler stage', () => {
    expect(stage('bundler')).toContain('bundle-api-lambda.mjs');
    expect(stage('runner')).not.toContain('bundle-api-lambda.mjs');
    expect(stage('builder')).not.toContain('bundle-api-lambda.mjs');
  });

  it('bundles before devDependencies are pruned', () => {
    // esbuild is a root devDependency, so `bundler` must branch off `builder`
    // rather than off the pruned tree.
    expect(dockerfile).toContain('FROM builder AS bundler');
    expect(stage('pruner')).toContain('pnpm prune --prod');
    expect(stage('runner')).toContain('COPY --from=pruner');
  });
});

describe('the lambda stage supplies what the bundle cannot derive', () => {
  const lambda = stage('runner-lambda');

  it('runs the bundle', () => {
    expect(lambda).toContain('CMD ["node", "dist-lambda/server.mjs"]');
    expect(lambda).toContain('COPY --from=bundler');
  });

  /**
   * Both directories are normally derived from `import.meta.url` by the module that
   * owns them. esbuild rewrites that to the bundle's own path, so the bundle would
   * look for locales under apps/api and migrations beside itself.
   */
  it.each([
    ['I18N_LOCALES_DIR', '/app/packages/@grantjs/i18n/locales'],
    ['DB_MIGRATIONS_DIR', '/app/packages/@grantjs/database/dist/migrations'],
  ])('sets %s', (key, value) => {
    expect(lambda).toContain(`ENV ${key}=${value}`);
  });

  it('does not set those overrides for the non-bundled image', () => {
    expect(stage('runner')).not.toContain('I18N_LOCALES_DIR');
    expect(stage('runner')).not.toContain('DB_MIGRATIONS_DIR');
  });
});
