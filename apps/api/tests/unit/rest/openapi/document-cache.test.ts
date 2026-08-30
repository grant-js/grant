import { describe, expect, it } from 'vitest';

import { generateOpenApiDocument, getOpenApiDocument } from '@/rest/openapi';

describe('getOpenApiDocument', () => {
  it('returns the same document rather than regenerating it', () => {
    // The point of the accessor. Generation walks 87 endpoints and measured 260 ms in
    // the shipped container; `createApp` calls this per request now instead of once at
    // boot, so without memoization the change would trade a cold-start cost for a
    // per-request one.
    const first = getOpenApiDocument();
    const second = getOpenApiDocument();

    expect(second).toBe(first);
  });

  it('produces the same content the eager generator does', () => {
    // Deferring must not change what is served. Generation is driven by module-level
    // registration, not request state, so a fresh document is deep-equal to the cached
    // one — which is also what makes caching safe.
    expect(getOpenApiDocument()).toStrictEqual(generateOpenApiDocument());
  });

  it('describes the endpoint surface, so an empty document cannot pass silently', () => {
    const paths = Object.keys(getOpenApiDocument().paths ?? {});
    expect(paths.length).toBeGreaterThan(50);
  });
});
