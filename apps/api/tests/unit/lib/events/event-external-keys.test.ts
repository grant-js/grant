import { describe, expect, it } from 'vitest';

import { resolveExternalKeys } from '@/lib/events/event-external-keys.lib';

const A = '30000000-0000-4000-8000-00000000000a';
const B = '30000000-0000-4000-8000-00000000000b';

const marker = (projectId: string, externalKey: unknown, kind = 'user') => ({
  cdmImport: { projectId, kind, externalKey },
});
const legacy = (id: unknown, extra: Record<string, unknown> = {}) => ({
  cdmSource: { legacy: { id, ...extra } },
});

describe('resolveExternalKeys', () => {
  it('keeps the marker key of the membership row when it is not e-mail shaped', () => {
    expect(
      resolveExternalKeys({}, [
        { projectId: A, metadata: { ...marker(A, 'key-1'), ...legacy('x') } },
      ])
    ).toEqual([{ projectId: A, externalKey: 'key-1' }]);
  });

  it('falls back to cdmSource.legacy.id when the marker key is an e-mail address', () => {
    expect(
      resolveExternalKeys({}, [
        { projectId: A, metadata: { ...marker(A, 'someone@example.test'), ...legacy('legacy-7') } },
      ])
    ).toEqual([{ projectId: A, externalKey: 'legacy-7' }]);
  });

  it('reads legacy.id from a row that has no marker (a row imported before the marker)', () => {
    expect(resolveExternalKeys({}, [{ projectId: A, metadata: legacy('legacy-8') }])).toEqual([
      { projectId: A, externalKey: 'legacy-8' },
    ]);
  });

  it('skips an e-mail shaped legacy.id and any value containing @', () => {
    for (const id of ['someone@example.test', 'not-an-email@', 'a@b', 'id with @ inside']) {
      expect(resolveExternalKeys({}, [{ projectId: A, metadata: legacy(id) }]), id).toEqual([]);
    }
    expect(resolveExternalKeys({}, [{ projectId: A, metadata: marker(A, 'name@host') }])).toEqual(
      []
    );
  });

  it('skips a value that is blank, too long, or not a string, and never truncates', () => {
    for (const id of ['', '   ', 'x'.repeat(256), 'x'.repeat(10_000), 42, { a: 1 }, ['a'], null]) {
      expect(resolveExternalKeys({}, [{ projectId: A, metadata: legacy(id) }])).toEqual([]);
    }
    expect(resolveExternalKeys({}, [{ projectId: A, metadata: legacy('x'.repeat(255)) }])).toEqual([
      { projectId: A, externalKey: 'x'.repeat(255) },
    ]);
    expect(resolveExternalKeys({}, [{ projectId: A, metadata: legacy('  padded  ') }])).toEqual([
      { projectId: A, externalKey: 'padded' },
    ]);
  });

  it('lets the row win over the global user', () => {
    expect(
      resolveExternalKeys(marker(A, 'global-key'), [
        { projectId: A, metadata: marker(A, 'row-key') },
      ])
    ).toEqual([{ projectId: A, externalKey: 'row-key' }]);
  });

  it('uses the global user only when its marker names that project', () => {
    expect(resolveExternalKeys(marker(A, 'global-key'), [{ projectId: A, metadata: {} }])).toEqual([
      { projectId: A, externalKey: 'global-key' },
    ]);
    // Another project's marker, and another kind of marker, are ignored.
    expect(
      resolveExternalKeys({ ...marker(B, 'other'), ...legacy('l-1') }, [
        { projectId: A, metadata: {} },
      ])
    ).toEqual([]);
    expect(
      resolveExternalKeys(marker(A, 'role-key', 'role'), [{ projectId: A, metadata: {} }])
    ).toEqual([]);
  });

  it('reads legacy.id from the global user only behind a marker that names the project', () => {
    expect(
      resolveExternalKeys({ ...marker(A, 'me@example.test'), ...legacy('legacy-g') }, [
        { projectId: A, metadata: {} },
      ])
    ).toEqual([{ projectId: A, externalKey: 'legacy-g' }]);
    expect(resolveExternalKeys(legacy('legacy-g'), [{ projectId: A, metadata: {} }])).toEqual([]);
  });

  it('ignores a row marker that names another project or kind (its legacy.id still applies)', () => {
    expect(resolveExternalKeys({}, [{ projectId: A, metadata: marker(B, 'foreign') }])).toEqual([]);
    expect(
      resolveExternalKeys({}, [
        { projectId: A, metadata: { ...marker(B, 'foreign'), ...legacy('l-2') } },
      ])
    ).toEqual([{ projectId: A, externalKey: 'l-2' }]);
  });

  it('gives one entry per project, in membership order, dropping duplicates and projects without a key', () => {
    expect(
      resolveExternalKeys({}, [
        { projectId: A, metadata: marker(A, 'first') },
        { projectId: B, metadata: {} },
        { projectId: A, metadata: marker(A, 'second') },
      ])
    ).toEqual([{ projectId: A, externalKey: 'first' }]);
  });

  it('is empty for a Grant-native user (no marker, no cdmSource) and with no memberships', () => {
    expect(resolveExternalKeys({}, [{ projectId: A, metadata: {} }])).toEqual([]);
    expect(resolveExternalKeys({ unrelated: true }, [{ projectId: A, metadata: null }])).toEqual(
      []
    );
    expect(resolveExternalKeys(marker(A, 'k'), [])).toEqual([]);
  });

  it('survives hostile metadata', () => {
    const hostile: unknown[] = [
      null,
      undefined,
      'text',
      42,
      [],
      { cdmSource: 'text' },
      { cdmSource: [] },
      { cdmSource: { legacy: [] } },
      { cdmSource: { legacy: 'x' } },
      { cdmSource: { legacy: { id: 42 } } },
      { cdmSource: { legacy: { id: { toString: 'x' } } } },
      { cdmSource: { legacy: { id: 'x'.repeat(10_240) } } },
      { cdmImport: 'text' },
      { cdmImport: [] },
      { cdmImport: { projectId: A, kind: 'user', externalKey: 7 } },
    ];
    for (const metadata of hostile) {
      expect(resolveExternalKeys(metadata, [{ projectId: A, metadata }])).toEqual([]);
    }
  });

  it('emits nothing but projectId and externalKey, whatever else the metadata holds', () => {
    const entries = resolveExternalKeys(
      { name: 'Jane', passwordHash: 'h', ...marker(A, 'k-global') },
      [
        {
          projectId: A,
          metadata: {
            ...marker(A, 'k-row'),
            cdmSource: {
              legacy: { id: 'legacy-1', email: 'someone@example.test', roles: ['admin'] },
              searchable: { email: 'someone@example.test' },
              grantUserId: A,
            },
            fingerprint: 'abc',
          },
        },
      ]
    );

    expect(entries).toEqual([{ projectId: A, externalKey: 'k-row' }]);
    expect(Object.keys(entries[0]!).sort()).toEqual(['externalKey', 'projectId']);
    expect(JSON.stringify(entries)).not.toMatch(/example\.test|Jane|abc|admin/);
  });
});
