/**
 * The target's config file must not rebuild the container images.
 *
 * `deploy/aws/.env` is this target's `values.yaml`: the thing an adopter edits to
 * change a schedule or a rate limit. Editing it should move Lambda environment
 * variables and EventBridge rules and nothing else. Measured during slice 7, it
 * rebuilt and re-pushed **both** images, turning a configuration change into a
 * five-minute deploy.
 *
 * The cause is `.dockerignore` semantics rather than anything in this package: Docker
 * matches ignore patterns against the whole relative path, so a bare `.env` covers
 * only the context root and leaves `deploy/aws/.env` in the build context, where it
 * feeds the `DockerImageAsset` fingerprint.
 *
 * This is **not** a secret-leak test — `env-file-leak.test.ts` owns that, and no
 * `COPY` in either Dockerfile reaches `deploy/`. It is about churn.
 *
 * Two properties of how it is written, both learned the hard way:
 *
 * 1. **It fingerprints a fixture, not the repo.** The obvious version writes probe
 *    files into `deploy/aws/` and synthesizes. That mutates state every other test
 *    file's synth depends on, and vitest runs files in parallel — it broke three
 *    unrelated tests. The fixture copies the **real** `.dockerignore`, so the artifact
 *    under test is still the repo's.
 * 2. **It constructs `DockerImageAsset` in-process** rather than shelling out to
 *    `cdk synth`. The hash is computed at construction; no daemon and no CLI are
 *    involved. That is the difference between a test measured in milliseconds and one
 *    measured in minutes.
 */
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { App, Stack } from 'aws-cdk-lib';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

/**
 * A build context shaped like the repo, carrying the repo's own ignore rules.
 *
 * `extraFiles` are written relative to the context root, so a case can place a file
 * exactly where the real one lives.
 */
function hashContext(extraFiles: Record<string, string>): string {
  const context = mkdtempSync(join(tmpdir(), 'grant-churn-'));

  cpSync(join(REPO_ROOT, '.dockerignore'), join(context, '.dockerignore'));
  writeFileSync(join(context, 'Dockerfile'), 'FROM scratch\n');

  for (const [relative, contents] of Object.entries(extraFiles)) {
    const target = join(context, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }

  const stack = new Stack(new App(), 'ChurnProbe');
  return new DockerImageAsset(stack, 'Asset', { directory: context }).assetHash;
}

describe('the config file does not rebuild the container images', () => {
  it('excludes a nested .env from the build context', () => {
    const before = hashContext({
      'deploy/aws/.env': 'JOBS_WEBHOOK_DELIVERY_SCHEDULE=* * * * *\n',
    });
    const after = hashContext({
      'deploy/aws/.env': 'JOBS_WEBHOOK_DELIVERY_SCHEDULE=*/5 * * * *\n',
    });

    expect(after).toBe(before);
  });

  it('still sees a file the ignore rules do not cover', () => {
    // Guards against a vacuous pass: if the fingerprint ignored this directory
    // wholesale, or the fixture were empty, the assertion above would hold for the
    // wrong reason.
    const before = hashContext({ 'deploy/aws/notes.txt': 'one\n' });
    const after = hashContext({ 'deploy/aws/notes.txt': 'two\n' });

    expect(after).not.toBe(before);
  });

  it('keeps the context-root example file, which is not secret', () => {
    const withExample = hashContext({ '.env.example': 'GITHUB_CLIENT_ID=\n' });
    const withoutExample = hashContext({});

    expect(withExample).not.toBe(withoutExample);
  });
});
