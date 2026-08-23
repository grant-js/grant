import type { ICacheAdapter } from '@grantjs/core';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

/**
 * Shared conformance suite for `ICacheAdapter` implementations.
 *
 * This file is the executable definition of what `ICacheAdapter` means. It is
 * written against the adapters that already exist (`memory`, `redis`) and is the
 * acceptance oracle for any adapter added later: a new adapter conforms when it
 * passes this suite unmodified.
 *
 * Anything the suite does not assert is not a guarantee of the port, however
 * confidently it may be described elsewhere. See `describedDivergences` below for
 * the behaviours where the existing adapters disagree and the port is therefore
 * silent.
 */

export interface CacheConformanceHarness {
  /** Build an adapter isolated from every other test (own namespace/prefix). */
  create: () => ICacheAdapter | Promise<ICacheAdapter>;
  /** Release resources. Called once, after the suite. */
  teardown?: (adapter: ICacheAdapter) => Promise<void> | void;
}

export interface CacheConformanceOptions {
  /**
   * True for adapters that JSON round-trip values on the way in and out
   * (`redis`, and any future store that persists bytes rather than references).
   *
   * False for adapters that hold the caller's object graph directly (`memory`).
   *
   * The distinction is not cosmetic: it decides whether `get()` can return the
   * same reference the caller passed to `set()`, and whether an array of strings
   * comes back as a `Set`. Tier 2 below only runs when this is true.
   */
  serializes: boolean;
}

/** Wall-clock TTL tests need a real wait; Redis TTL granularity is whole seconds. */
const TTL_SECONDS = 1;
const TTL_WAIT_MS = 1_400;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function runCacheAdapterConformance(
  label: string,
  harness: CacheConformanceHarness,
  options: CacheConformanceOptions
): void {
  describe(`ICacheAdapter conformance: ${label}`, () => {
    let cache: ICacheAdapter;

    beforeEach(async () => {
      cache ??= await harness.create();
      await cache.clear();
    });

    afterAll(async () => {
      if (cache) {
        await harness.teardown?.(cache);
      }
    });

    describe('tier 1 — port contract (every adapter)', () => {
      it('returns null for a key that was never set', async () => {
        expect(await cache.get('absent')).toBeNull();
      });

      it('round-trips a Set of strings, the port default type', async () => {
        await cache.set('roles', new Set(['admin', 'editor']));
        const value = await cache.get<Set<string>>('roles');

        expect(value).toBeInstanceOf(Set);
        expect(value && Array.from(value).sort()).toEqual(['admin', 'editor']);
      });

      it('round-trips a plain object', async () => {
        await cache.set('result', { allowed: true, reason: 'role-grant', depth: 2 });

        expect(
          await cache.get<{ allowed: boolean; reason: string; depth: number }>('result')
        ).toEqual({
          allowed: true,
          reason: 'role-grant',
          depth: 2,
        });
      });

      it('round-trips a string', async () => {
        await cache.set('pem', '-----BEGIN PUBLIC KEY-----');

        expect(await cache.get<string>('pem')).toBe('-----BEGIN PUBLIC KEY-----');
      });

      it('round-trips a number and a boolean', async () => {
        await cache.set('count', 42);
        await cache.set('enabled', false);

        expect(await cache.get<number>('count')).toBe(42);
        expect(await cache.get<boolean>('enabled')).toBe(false);
      });

      it('overwrites an existing key rather than merging', async () => {
        await cache.set('k', { a: 1, b: 2 });
        await cache.set('k', { a: 9 });

        expect(await cache.get<Record<string, number>>('k')).toEqual({ a: 9 });
      });

      it('reports presence with has()', async () => {
        await cache.set('present', 'yes');

        expect(await cache.has('present')).toBe(true);
        expect(await cache.has('absent')).toBe(false);
      });

      it('deletes a key', async () => {
        await cache.set('doomed', 'x');
        await cache.delete('doomed');

        expect(await cache.get('doomed')).toBeNull();
        expect(await cache.has('doomed')).toBe(false);
      });

      it('tolerates deleting a key that does not exist', async () => {
        await expect(cache.delete('never-existed')).resolves.not.toThrow();
      });

      it('clear() empties the namespace', async () => {
        await cache.set('a', '1');
        await cache.set('b', '2');
        await cache.clear();

        expect(await cache.keys()).toEqual([]);
        expect(await cache.get('a')).toBeNull();
      });

      it('keys() with no pattern returns every key set', async () => {
        await cache.set('alpha', '1');
        await cache.set('beta', '2');

        expect((await cache.keys()).sort()).toEqual(['alpha', 'beta']);
      });

      it('keys() filters by trailing-wildcard prefix', async () => {
        await cache.set('auth:result:user-1:org-1', '1');
        await cache.set('auth:result:user-1:org-2', '2');
        await cache.set('auth:result:user-2:org-1', '3');

        const matched = await cache.keys('auth:result:user-1:*');

        expect(matched.sort()).toEqual(['auth:result:user-1:org-1', 'auth:result:user-1:org-2']);
      });

      it('keys() returns empty when a prefix matches nothing', async () => {
        await cache.set('present', '1');

        expect(await cache.keys('missing:*')).toEqual([]);
      });

      it('keys() prefix matching is not delimiter-anchored', async () => {
        // Characterises current behaviour rather than endorsing it:
        // `organization:org-1*` also matches `organization:org-10`. Relied upon by
        // invalidateSigningKeysCacheForScope, which over-invalidates by design.
        await cache.set('organization:org-1', '1');
        await cache.set('organization:org-10', '2');

        expect((await cache.keys('organization:org-1*')).sort()).toEqual([
          'organization:org-1',
          'organization:org-10',
        ]);
      });

      it('expires a key once its TTL elapses', async () => {
        await cache.set('ephemeral', 'gone-soon', TTL_SECONDS);
        expect(await cache.get('ephemeral')).not.toBeNull();

        await wait(TTL_WAIT_MS);

        expect(await cache.get('ephemeral')).toBeNull();
        expect(await cache.has('ephemeral')).toBe(false);
      });

      it('keeps a key without a TTL alive across the same window', async () => {
        await cache.set('persistent', 'still-here');

        await wait(TTL_WAIT_MS);

        expect(await cache.get('persistent')).not.toBeNull();
      });
    });

    describe.runIf(options.serializes)('tier 2 — serializing adapters only', () => {
      it('coerces an array of strings into a Set on read', async () => {
        // Load-bearing, not incidental: the port's default type parameter is
        // Set<string>, and this coercion is how a serializing adapter preserves
        // the Set round-trip that `memory` gets for free by holding a reference.
        // oauth-state.service.ts reads `.size` off the result.
        await cache.set('list', ['a', 'b']);
        const value = await cache.get<Set<string>>('list');

        expect(value).toBeInstanceOf(Set);
        expect(value && Array.from(value).sort()).toEqual(['a', 'b']);
      });

      it('coerces an empty array into an empty Set', async () => {
        await cache.set('empty', []);
        const value = await cache.get<Set<string>>('empty');

        expect(value).toBeInstanceOf(Set);
        expect(value?.size).toBe(0);
      });

      it('leaves a mixed array as an array', async () => {
        await cache.set('mixed', ['a', 1]);

        expect(await cache.get<unknown[]>('mixed')).toEqual(['a', 1]);
      });

      it('leaves an array of objects as an array', async () => {
        await cache.set('objects', [{ id: 'a' }]);

        expect(await cache.get<unknown[]>('objects')).toEqual([{ id: 'a' }]);
      });

      it('stores a snapshot, not a live reference', async () => {
        const mutable = { items: ['one'] };
        await cache.set('snapshot', mutable);
        mutable.items.push('two');

        expect(await cache.get<{ items: string[] }>('snapshot')).toEqual({ items: ['one'] });
      });

      it('does not preserve Date instances', async () => {
        const when = new Date('2026-08-21T00:00:00.000Z');
        await cache.set('at', { when });

        const value = await cache.get<{ when: unknown }>('at');

        expect(value?.when).toBe('2026-08-21T00:00:00.000Z');
        expect(value?.when).not.toBeInstanceOf(Date);
      });
    });
  });
}

/*
 * Behaviours where `memory` and `redis` disagree today — the divergence index.
 *
 * Behaviours where `memory` and `redis` disagree today, and which the port is
 * therefore silent about. Recorded here so a future adapter author makes a
 * deliberate choice instead of inheriting one by accident.
 *
 * Each is asserted per-adapter in that adapter's own test file, not in the shared
 * suite — the shared suite may only contain behaviour every adapter shares.
 *
 * 1. **Reference vs. snapshot.** `memory` returns the caller's object graph, so a
 *    later mutation is visible through the cache. Serializing adapters return a
 *    copy. Tier 2 pins the serializing side; `memory/index.test.ts` pins the other.
 *
 * 2. **Array-of-strings coercion.** Serializing adapters return a `Set`; `memory`
 *    returns the array it was given.
 *
 * 3. **Default TTL.** `redis` applies 86400s when `ttlSeconds` is omitted
 *    (`redis/index.ts`, `setex`); `memory` stores the entry with no expiry at all.
 *    **Not asserted anywhere** — the divergence is only observable after 24 hours,
 *    and `ICacheAdapter` exposes no TTL introspection to shorten that. It is a
 *    real difference that cannot honestly be expressed as a test, so it is
 *    documented rather than pinned.
 *
 * 4. **`disconnect()` and durability.** `memory.disconnect()` drops the data;
 *    `redis.disconnect()` closes the client and leaves the data in Redis. The port
 *    does not say which is correct.
 */
