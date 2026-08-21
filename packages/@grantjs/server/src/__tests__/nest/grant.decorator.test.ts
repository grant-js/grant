import { describe, expect, it, vi } from 'vitest';

vi.mock('@nestjs/common', () => ({
  SetMetadata: vi.fn((key: string, value: unknown) => ({ __setMetadata: { key, value } })),
}));

const { SetMetadata } = await import('@nestjs/common');
const { GRANT_OPTIONS_KEY, Grant } = await import('../../nest/grant.decorator');

/**
 * Pass 7, slice 8. `Grant` is semver-public and overloaded — `Grant(resource, action)`
 * and `Grant({ resource, action })` — with the discrimination done at runtime by a
 * ternary rather than by the overload signatures. The types cannot check that the
 * runtime branch matches the declared overloads; only a test can.
 */

describe('Grant decorator', () => {
  it('writes options under the documented metadata key', () => {
    expect(GRANT_OPTIONS_KEY).toBe('grant:options');
    Grant('Document', 'Query');
    expect(SetMetadata).toHaveBeenCalledWith('grant:options', {
      resource: 'Document',
      action: 'Query',
    });
  });

  it('accepts the two-argument form', () => {
    vi.mocked(SetMetadata).mockClear();
    Grant('Project', 'Create');
    expect(SetMetadata).toHaveBeenCalledWith(GRANT_OPTIONS_KEY, {
      resource: 'Project',
      action: 'Create',
    });
  });

  it('accepts the options-object form', () => {
    vi.mocked(SetMetadata).mockClear();
    Grant({ resource: 'Organization', action: 'Update' });
    expect(SetMetadata).toHaveBeenCalledWith(GRANT_OPTIONS_KEY, {
      resource: 'Organization',
      action: 'Update',
    });
  });

  it('returns whatever SetMetadata returns, so it composes as a Nest decorator', () => {
    vi.mocked(SetMetadata).mockClear();
    const result = Grant('Document', 'Delete');
    expect(result).toEqual({
      __setMetadata: { key: GRANT_OPTIONS_KEY, value: { resource: 'Document', action: 'Delete' } },
    });
  });

  it('CHARACTERIZATION: a string first argument with no action is passed through as-is', () => {
    // The ternary requires BOTH a string and a defined action to build the object;
    // otherwise it casts the first argument to GrantOptions. Called as `Grant('Document')`
    // — which the overloads forbid, but plain JS callers can do — the string reaches
    // SetMetadata unwrapped, and GrantGuard would later read `.resource` as undefined.
    // Fails closed (the guard cannot match a permission), but it fails late.
    vi.mocked(SetMetadata).mockClear();
    (Grant as (r: string) => unknown)('Document');
    expect(SetMetadata).toHaveBeenCalledWith(GRANT_OPTIONS_KEY, 'Document');
  });
});
