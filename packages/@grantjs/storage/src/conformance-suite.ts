import type { IFileStorageService } from '@grantjs/core';
import { GrantException, ValidationError } from '@grantjs/core';
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
  /**
   * Write bytes to a minted upload URL the way a client would, and report the
   * status. Absolute URLs go over the network; the local adapter's are
   * application-relative, so its test file stands up a throwaway server.
   */
  put: (
    url: string,
    method: string,
    headers: Record<string, string>,
    body: Buffer
  ) => Promise<{ status: number }>;

  /** Release resources and remove anything the run created. Called once, after the suite. */
  teardown?: (adapter: IFileStorageService) => Promise<void> | void;
}

export interface StorageConformanceOptions {
  /**
   * True for object stores, which return a URL with a scheme and host; false for
   * adapters this application serves itself, whose URLs are path-only.
   */
  urlsAreAbsolute: boolean;

  /**
   * True when the thing on the other end of the URL actually enforces what the URL
   * commits to. Tier 3 only runs when it is.
   *
   * **False for S3 is a property of the emulator, not of the adapter.** LocalStack
   * community 3.8 does not verify SigV4 at all: measured 2026-09-11, a PUT with the
   * signature replaced by 64 zeroes returned 200 and stored the object, as did a
   * URL signed for 999 bytes carrying 64, a URL fired 2.5 s past a 1-second expiry,
   * and a URL whose key was rewritten to another tenant's prefix. Real S3 enforces
   * all of it; nothing in this repository demonstrates that. Slice 16's recorded
   * deploy is where it gets demonstrated. A future reader who upgrades LocalStack
   * should flip this flag, not delete the tier.
   */
  enforcesUrlConstraints: boolean;
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

export function runFileStorageConformance(
  label: string,
  harness: StorageConformanceHarness,
  options: StorageConformanceOptions
): void {
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

    describe('getUploadUrl — tier 1, what the URL commits to', () => {
      const validOptions = { contentLength: 1024, contentType: 'image/png', expiresInSeconds: 900 };

      it('returns a PUT URL carrying the content type as a header', async () => {
        const result = await storage.getUploadUrl(uniquePath('mint.png'), validOptions);

        expect(result.url).toBeTruthy();
        expect(result.method).toBe('PUT');
        expect(result.headers['Content-Type']).toBe('image/png');
      });

      it('does not ask the client to set Content-Length', async () => {
        // `Content-Length` is a forbidden header name for `fetch`: the user agent
        // sets it from the body. Returning it would be an instruction no browser
        // caller can follow, even though the URL commits to the value.
        const result = await storage.getUploadUrl(uniquePath('nolen.png'), validOptions);

        const names = Object.keys(result.headers).map((name) => name.toLowerCase());
        expect(names).not.toContain('content-length');
      });

      it('reports an expiry matching the requested lifetime', async () => {
        const before = Date.now();

        const result = await storage.getUploadUrl(uniquePath('expiry.png'), validOptions);

        const skew = Math.abs(result.expiresAt.getTime() - (before + 900_000));
        expect(skew).toBeLessThanOrEqual(2_000);
      });

      it('binds the URL to the storage path', async () => {
        const path = uniquePath('bound.png');

        const result = await storage.getUploadUrl(path, validOptions);

        expect(
          decodeURIComponent(new URL(result.url, 'http://placeholder.invalid').pathname)
        ).toContain(path);
      });

      it(`returns ${options.urlsAreAbsolute ? 'an absolute' : 'an application-relative'} URL`, async () => {
        const result = await storage.getUploadUrl(uniquePath('shape.png'), validOptions);

        expect(/^https?:\/\//.test(result.url)).toBe(options.urlsAreAbsolute);
      });

      it('signs the path: two mints differing only in path differ', async () => {
        const a = await storage.getUploadUrl(uniquePath('a.png'), validOptions);
        const b = await storage.getUploadUrl(uniquePath('b.png'), validOptions);

        expect(a.url).not.toBe(b.url);
      });

      it('signs the content type: two mints differing only in contentType differ', async () => {
        // The adapter-independent form of the S3 trap: `getSignedUrl` accepts a
        // ContentType and does *not* sign it unless asked to, so an implementation
        // can hand out a URL that appears to pin the type and accepts anything.
        const path = uniquePath('ct.png');

        const png = await storage.getUploadUrl(path, validOptions);
        const gif = await storage.getUploadUrl(path, { ...validOptions, contentType: 'image/gif' });

        expect(png.url).not.toBe(gif.url);
      });

      it('signs the length: two mints differing only in contentLength differ', async () => {
        const path = uniquePath('len.png');

        const small = await storage.getUploadUrl(path, validOptions);
        const large = await storage.getUploadUrl(path, { ...validOptions, contentLength: 2048 });

        expect(small.url).not.toBe(large.url);
      });

      it('signs the expiry: two mints differing only in expiresInSeconds differ', async () => {
        const path = uniquePath('exp.png');

        const short = await storage.getUploadUrl(path, validOptions);
        const long = await storage.getUploadUrl(path, { ...validOptions, expiresInSeconds: 1800 });

        expect(short.url).not.toBe(long.url);
      });

      it.each([0, -1, 1.5, 604_801])('refuses expiresInSeconds of %s', async (expiresInSeconds) => {
        await expect(
          storage.getUploadUrl(uniquePath('bad-exp.png'), { ...validOptions, expiresInSeconds })
        ).rejects.toBeInstanceOf(ValidationError);
      });

      it.each([0, -1, 1.5])('refuses contentLength of %s', async (contentLength) => {
        await expect(
          storage.getUploadUrl(uniquePath('bad-len.png'), { ...validOptions, contentLength })
        ).rejects.toBeInstanceOf(ValidationError);
      });

      it.each([
        // The message is asserted, not just the type. `..` and `.grant-upload-key`
        // are both dot-prefixed, so a single rule would refuse both and the two
        // cases could not tell each other apart — a mutation deleting the traversal
        // branch survived until this assertion named which rule fired.
        ['a traversing segment', 'tenants/../../etc/passwd', /traverse/i],
        ['a leading separator', '/tenants/t1/avatar.png', /relative/i],
        ['an empty segment', 'tenants//avatar.png', /empty segment/i],
        ['a dot-prefixed segment', 'tenants/.grant-upload-key', /dot-prefixed/i],
      ])('refuses a path with %s', async (_label, path, message) => {
        await expect(storage.getUploadUrl(path, validOptions)).rejects.toThrow(
          expect.objectContaining({ message: expect.stringMatching(message) })
        );
        await expect(storage.getUploadUrl(path, validOptions)).rejects.toBeInstanceOf(
          ValidationError
        );
      });

      it('getMetadata returns null for a path holding nothing', async () => {
        expect(await storage.getMetadata(uniquePath('never-stored.bin'))).toBeNull();
      });
    });

    describe('getUploadUrl — tier 2, the round trip', () => {
      const upload = async (name: string, content: Buffer, contentType = 'image/png') => {
        const path = uniquePath(name);
        const minted = await storage.getUploadUrl(path, {
          contentLength: content.length,
          contentType,
          expiresInSeconds: 900,
        });
        const response = await harness.put(minted.url, minted.method, minted.headers, content);
        return { path, response };
      };

      it('accepts a PUT made exactly as the result describes', async () => {
        const { response } = await upload('roundtrip.png', bytes(256, 'r'));

        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(300);
      });

      it('the uploaded path then exists', async () => {
        const { path } = await upload('exists-after.png', bytes(64, 'e'));

        expect(await storage.exists(path)).toBe(true);
      });

      it('getMetadata reports the size the store actually holds', async () => {
        const { path } = await upload('sized-after.png', bytes(777, 's'));

        expect((await storage.getMetadata(path))?.size).toBe(777);
      });

      it('stores the exact bytes the client sent', async () => {
        const content = bytes(512, 'x');

        const { path } = await upload('bytes-after.png', content);

        expect(await harness.readBack(path)).toEqual(content);
      });

      it('a second mint and PUT to the same path overwrites — last write wins', async () => {
        const path = uniquePath('replaced.png');
        const write = async (content: Buffer) => {
          const minted = await storage.getUploadUrl(path, {
            contentLength: content.length,
            contentType: 'image/png',
            expiresInSeconds: 900,
          });
          return harness.put(minted.url, minted.method, minted.headers, content);
        };
        await write(bytes(64, 'a'));

        await write(bytes(8, 'b'));

        expect(await harness.readBack(path)).toEqual(bytes(8, 'b'));
      });
    });

    describe.runIf(options.enforcesUrlConstraints)(
      'getUploadUrl — tier 3, the constraints are enforced',
      () => {
        const mint = (
          path: string,
          overrides: Partial<{
            contentLength: number;
            contentType: string;
            expiresInSeconds: number;
          }> = {}
        ) =>
          storage.getUploadUrl(path, {
            contentLength: 64,
            contentType: 'image/png',
            expiresInSeconds: 900,
            ...overrides,
          });

        const body = bytes(64, 'g');

        it('refuses a PUT whose path was rewritten to another prefix', async () => {
          const path = uniquePath('tenant-a/avatar.png');
          const stolen = path.replace('tenant-a', 'tenant-b');
          const minted = await mint(path);

          const response = await harness.put(
            minted.url.replace('tenant-a', 'tenant-b'),
            minted.method,
            minted.headers,
            body
          );

          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(await storage.exists(stolen)).toBe(false);
        });

        it('refuses a body longer than the committed length', async () => {
          const path = uniquePath('too-long.png');
          const minted = await mint(path);

          const response = await harness.put(
            minted.url,
            minted.method,
            minted.headers,
            bytes(65, 'g')
          );

          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(await storage.exists(path)).toBe(false);
        });

        it('refuses a body shorter than the committed length', async () => {
          const path = uniquePath('too-short.png');
          const minted = await mint(path);

          const response = await harness.put(
            minted.url,
            minted.method,
            minted.headers,
            bytes(63, 'g')
          );

          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(await storage.exists(path)).toBe(false);
        });

        it('refuses a content type other than the committed one', async () => {
          const path = uniquePath('wrong-type.png');
          const minted = await mint(path);

          const response = await harness.put(
            minted.url,
            minted.method,
            { ...minted.headers, 'Content-Type': 'application/x-sh' },
            body
          );

          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(await storage.exists(path)).toBe(false);
        });

        it('refuses a PUT made after the URL expired', async () => {
          const path = uniquePath('stale.png');
          const minted = await mint(path, { expiresInSeconds: 1 });
          await new Promise((resolve) => setTimeout(resolve, 1_500));

          const response = await harness.put(minted.url, minted.method, minted.headers, body);

          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(await storage.exists(path)).toBe(false);
        });

        it('refuses a PUT whose signature was tampered with', async () => {
          const path = uniquePath('forged.png');
          const minted = await mint(path);
          const url = new URL(minted.url, 'http://placeholder.invalid');
          const signatureParam = url.searchParams.has('sig') ? 'sig' : 'X-Amz-Signature';
          const original = url.searchParams.get(signatureParam) as string;
          url.searchParams.set(signatureParam, '0'.repeat(original.length));
          const forged = options.urlsAreAbsolute ? url.toString() : `${url.pathname}${url.search}`;

          const response = await harness.put(forged, minted.method, minted.headers, body);

          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(await storage.exists(path)).toBe(false);
        });
      }
    );

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
 *
 * 6. **`getMetadata().contentType`.** The same divergence, reached through the new
 *    method: `s3` returns the stored type, `local` returns `undefined` rather than
 *    guessing from the extension. Pinned on both sides in the adapters' own files.
 *    A confirm step may verify size on both stores and a content type on neither.
 *
 * 7. **Where the bytes travel.** An `s3` upload URL takes the client straight to the
 *    object store; a `local` one comes back to this application, which writes the
 *    file itself. Offload is a property of S3, not a promise of the port — the port
 *    promises a bounded capability, and both adapters honour that. ADR 0006.
 *
 * 8. **Whether two identical mints produce identical URLs.** SigV4 is deterministic
 *    to the second, so `s3` repeats itself; `local` happens to as well, but nothing
 *    obliges it to and a future adapter might carry a nonce. **Not asserted in the
 *    shared suite** in either direction — agreeing by coincidence is not a contract.
 *    `s3/index.test.ts` pins its own behaviour.
 *
 * 9. **Whether enforcement is provable in CI.** Not an adapter divergence at all —
 *    a test-environment one, recorded here because it looks like the former. The
 *    `local` adapter's constraints are enforced by our code and proven in the unit
 *    lane. S3's are enforced by AWS, and the integration lane runs against
 *    LocalStack 3.8, which does not verify SigV4 (see `enforcesUrlConstraints`).
 *    Nothing in this repository demonstrates that S3 refuses an oversized,
 *    mistyped, expired, forged or path-rewritten PUT; slice 16's recorded deploy is
 *    where that gets demonstrated.
 */
