import { noopLogger } from '@grantjs/core';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterAll, describe, expect, it } from 'vitest';

import { runFileStorageConformance } from '../conformance-suite';
import { LocalStorageAdapter } from './index';

/**
 * A real filesystem, not a mock. The adapter's whole job is `fs` calls, so a mock
 * would assert that the test doubles behave the way the test doubles were written
 * to behave. A temp directory costs nothing and tests the thing.
 */
const basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'grant-storage-conformance-'));

afterAll(async () => {
  await fs.rm(basePath, { recursive: true, force: true });
});

runFileStorageConformance('local', {
  create: () => new LocalStorageAdapter({ basePath }, noopLogger),
  readBack: (filePath) => fs.readFile(path.join(basePath, filePath)),
});

/**
 * The local side of the divergence index in ../conformance-suite.ts. These are the
 * behaviours the shared suite may not assert because `s3` does something else.
 */
describe('local adapter divergences', () => {
  const adapter = new LocalStorageAdapter({ basePath }, noopLogger);

  it('divergence 1 — builds an app-relative /storage URL, not an absolute one', async () => {
    expect(await adapter.getUrl('users/1/avatar.png')).toBe('/storage/users/1/avatar.png');
  });

  it('divergence 2 — returns a URL for a path that was never uploaded', async () => {
    expect(await adapter.getUrl('nothing-here.png')).toBe('/storage/nothing-here.png');
  });

  it('divergence 3 — ignores options.public entirely', async () => {
    const publicResult = await adapter.upload(Buffer.from('a'), 'flagged-public.bin', {
      public: true,
    });
    const privateResult = await adapter.upload(Buffer.from('a'), 'flagged-private.bin', {
      public: false,
    });

    expect(publicResult.url).toBe('/storage/flagged-public.bin');
    expect(privateResult.url).toBe('/storage/flagged-private.bin');
  });
});
