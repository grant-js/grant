import type { IFileStorageService } from '@grantjs/core';
import { GrantException } from '@grantjs/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Shared conformance suite for `IFileStorageService` implementations.
 *
 * This file is the executable definition of what `IFileStorageService` means. It is
 * written against the adapters that already exist (`local`, `s3`) and is the
 * acceptance oracle for any adapter added later: a new adapter conforms when it
 * passes this suite unmodified. `@grantjs/cache`'s `conformance-suite.ts` is the
 * model.
 *
 * Anything the suite does not assert is not a guarantee of the port, however
 * confidently it may be described elsewhere. See the divergence index at the foot
 * for the behaviours where the existing adapters disagree and the port is
 * therefore silent.
 *
 * **The port has no read method.** `getUrl()` hands out a URL; nothing on the
 * interface returns bytes. So "the bytes that came back are the bytes that went
 * in" cannot be asserted through the port at all, and the harness supplies
 * `readBack` to reach around it. That is not a convenience — without it the suite
 * could not tell a correct `upload()` from one that stored an empty file.
 */

export interface StorageConformanceHarness {
  /** Build an adapter isolated from every other test (own bucket/base path). */
  create: () => IFileStorageService | Promise<IFileStorageService>;
  /**
   * Read stored bytes out of band, without going through the port. See the note
   * above: the port cannot do this, so each adapter's own storage is read
   * directly.
   */
  readBack: (path: string) => Promise<Buffer>;
  /** Release resources and remove anything the run created. Called once, after the suite. */
  teardown?: (adapter: IFileStorageService) => Promise<void> | void;
}

/**
 * One LocalStack and one shared self-hosted runner serve every run, so paths have
 * to be unique per run. Fixed names would let two runs delete each other's objects
 * and fail in ways that look like adapter bugs — the lesson `@grantjs/cache`'s
 * DynamoDB suite records about table names.
 */
let counter = 0;
const runId = `${process.pid}-${Date.now()}`;
const uniquePath = (name: string) => `conformance/${runId}/${(counter += 1)}-${name}`;

const bytes = (n: number, fill = 'a') => Buffer.from(fill.repeat(n));

export function runFileStorageConformance(label: string, harness: StorageConformanceHarness): void {
  describe(`IFileStorageService conformance: ${label}`, () => {
    let storage: IFileStorageService;

    beforeAll(async () => {
      storage = await harness.create();
    });

    afterAll(async () => {
      if (storage) {
        await harness.teardown?.(storage);
      }
    });

    describe('upload', () => {
      it('stores the exact bytes it was given', async () => {
        const path = uniquePath('exact.bin');
        const content = bytes(1024, 'z');

        await storage.upload(content, path);

        expect(await harness.readBack(path)).toEqual(content);
      });

      it('echoes the path and reports the byte length as size', async () => {
        const path = uniquePath('sized.bin');

        const result = await storage.upload(bytes(333), path);

        expect(result.path).toBe(path);
        expect(result.size).toBe(333);
      });

      it('reports back the content type it was given', async () => {
        const path = uniquePath('typed.png');

        const result = await storage.upload(bytes(8), path, { contentType: 'image/png' });

        expect(result.contentType).toBe('image/png');
      });

      it('returns a non-empty url', async () => {
        // Only that there is one. What it *looks* like is divergence 1.
        const path = uniquePath('url.bin');

        const result = await storage.upload(bytes(8), path);

        expect(result.url).toBeTruthy();
        expect(typeof result.url).toBe('string');
      });

      it('stores an empty file rather than refusing it', async () => {
        const path = uniquePath('empty.bin');

        const result = await storage.upload(Buffer.alloc(0), path);

        expect(result.size).toBe(0);
        expect(await storage.exists(path)).toBe(true);
      });

      it('accepts a path with directory separators', async () => {
        // S3 keys are flat and `/` is an ordinary character; the local adapter has
        // to create directories to honour the same call. Both must accept it.
        const path = uniquePath('nested/deeper/still.bin');
        const content = bytes(16, 'n');

        await storage.upload(content, path);

        expect(await harness.readBack(path)).toEqual(content);
      });

      it('overwrites an existing path rather than appending or refusing', async () => {
        const path = uniquePath('overwrite.bin');
        await storage.upload(bytes(64, 'a'), path);

        await storage.upload(bytes(8, 'b'), path);

        expect(await harness.readBack(path)).toEqual(bytes(8, 'b'));
      });
    });

    describe('exists', () => {
      it('is false for a path never uploaded', async () => {
        expect(await storage.exists(uniquePath('absent.bin'))).toBe(false);
      });

      it('is true once uploaded', async () => {
        const path = uniquePath('present.bin');
        await storage.upload(bytes(8), path);

        expect(await storage.exists(path)).toBe(true);
      });
    });

    describe('delete', () => {
      it('removes the file', async () => {
        const path = uniquePath('doomed.bin');
        await storage.upload(bytes(8), path);

        await storage.delete(path);

        expect(await storage.exists(path)).toBe(false);
      });

      it('tolerates deleting a path that does not exist', async () => {
        // Both adapters treat delete as idempotent: the local one swallows ENOENT,
        // and S3's DeleteObject succeeds on a missing key. A caller cleaning up
        // after a failed upload must not have to check first.
        await expect(storage.delete(uniquePath('never-there.bin'))).resolves.toBeUndefined();
      });
    });

    describe('copy', () => {
      it('duplicates the bytes at the destination', async () => {
        const source = uniquePath('source.bin');
        const destination = uniquePath('destination.bin');
        const content = bytes(128, 'c');
        await storage.upload(content, source);

        await storage.copy(source, destination);

        expect(await harness.readBack(destination)).toEqual(content);
      });

      it('leaves the source in place', async () => {
        const source = uniquePath('kept.bin');
        const destination = uniquePath('copy-of-kept.bin');
        await storage.upload(bytes(8), source);

        await storage.copy(source, destination);

        expect(await storage.exists(source)).toBe(true);
      });

      it('creates intervening directories at the destination', async () => {
        const source = uniquePath('flat.bin');
        const destination = uniquePath('into/a/new/place.bin');
        await storage.upload(bytes(8), source);

        await storage.copy(source, destination);

        expect(await storage.exists(destination)).toBe(true);
      });

      it('throws GrantException when the source does not exist', async () => {
        // The one error path both adapters agree on. `delete` is forgiving because
        // the caller's intent is already satisfied; `copy` is not, because a silent
        // no-op leaves the caller believing a file exists that does not.
        await expect(
          storage.copy(uniquePath('no-source.bin'), uniquePath('no-destination.bin'))
        ).rejects.toBeInstanceOf(GrantException);
      });
    });

    describe('getUrl', () => {
      it('returns a non-empty string for a stored file', async () => {
        const path = uniquePath('linked.bin');
        await storage.upload(bytes(8), path);

        const url = await storage.getUrl(path);

        expect(url).toBeTruthy();
        expect(typeof url).toBe('string');
      });

      it('includes the path in the url', async () => {
        // Weak on purpose: the two adapters build entirely different URLs
        // (divergence 1), and containment is the strongest claim both can meet.
        const path = uniquePath('findable.bin');
        await storage.upload(bytes(8), path);

        const url = await storage.getUrl(path);

        expect(decodeURIComponent(new URL(url, 'http://placeholder.invalid').pathname)).toContain(
          path
        );
      });
    });
  });
}

/*
 * Behaviours where `local` and `s3` disagree today, and which the port is
 * therefore silent about. Recorded here so a future adapter author makes a
 * deliberate choice instead of inheriting one by accident.
 *
 * Each is asserted per-adapter in that adapter's own test file, not in the shared
 * suite — the shared suite may only contain behaviour every adapter shares.
 *
 * 1. **URL shape.** `local` returns the app-relative `/storage/<path>` and nothing
 *    else. `s3` returns `${publicUrl}/<path>` when a public URL is configured, and
 *    otherwise a presigned GET that expires in an hour. The port says only that
 *    `getUrl` returns "a public URL", which is true of neither in general: the
 *    local one is not absolute, and the S3 one is not public.
 *
 * 2. **`getUrl` for a file that does not exist.** `local` builds the string without
 *    touching the filesystem, and `s3` signs without a HEAD, so **both return a URL
 *    for an absent path** — but for different reasons, and neither promises it.
 *    Not asserted: agreeing by coincidence is not a contract.
 *
 * 3. **`options.public`.** `s3` sets `ACL: 'public-read'` and prefers `publicUrl`;
 *    `local` ignores the flag entirely, because everything under the static mount
 *    is equally reachable. A caller that relies on `public: false` meaning "not
 *    reachable" is wrong on local.
 *
 * 4. **`options.metadata`.** `s3` stores it as object metadata; `local` accepts and
 *    discards it. **Not asserted anywhere** — the port exposes no way to read
 *    metadata back, so the divergence cannot honestly be expressed as a test. It is
 *    documented rather than pinned.
 *
 * 5. **Content type at rest.** `s3` persists it on the object, so a later GET
 *    returns it. `local` stores bytes only; the content type is re-derived from the
 *    file extension by `storage.middleware.ts` at serve time. Both echo the value
 *    back from `upload()`, which is the part the suite asserts.
 */
