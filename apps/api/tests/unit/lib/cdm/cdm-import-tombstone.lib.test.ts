/**
 * The deletion tombstone policy as pure functions, one named test per branch: which keys a
 * self-deleted user leaves behind, whether a deletion writes, and whether an import creates.
 * Keys can be addresses, so every test also pins that none leaves a function but as a digest.
 */
import { describe, expect, it } from 'vitest';

import { fingerprintCdmExternalKey } from '@/lib/cdm/cdm-api-key-fingerprint.lib';
import {
  CDM_TOMBSTONE_KIND_USER,
  decideTombstoneWrite,
  decideUserCreation,
  fingerprintDocumentKeys,
  resolveTombstoneKeys,
} from '@/lib/cdm/cdm-import-tombstone.lib';

const SECRET = 'unit-test-cdm-fingerprint-secret';
const projectA = '10000000-0000-4000-8000-00000000000a';
const projectB = '10000000-0000-4000-8000-00000000000b';
const userId = '30000000-0000-4000-8000-000000000001';
const otherUserId = '30000000-0000-4000-8000-000000000002';
const ADDRESS = 'person.one@example.com';

const marker = (projectId: string, externalKey: unknown, kind = 'user') => ({
  cdmImport: { projectId, kind, externalKey },
});

describe('fingerprintCdmExternalKey', () => {
  it('is deterministic for the same kind, key and secret', () => {
    expect(fingerprintCdmExternalKey('user', ADDRESS, SECRET)).toBe(
      fingerprintCdmExternalKey('user', ADDRESS, SECRET)
    );
  });

  it('is a 64-character hex digest that contains neither the key nor its local part', () => {
    const fingerprint = fingerprintCdmExternalKey('user', ADDRESS, SECRET);
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(fingerprint).not.toContain('person');
  });

  it('differs by kind', () => {
    expect(fingerprintCdmExternalKey('user', 'k', SECRET)).not.toBe(
      fingerprintCdmExternalKey('group', 'k', SECRET)
    );
  });

  it('differs by key and by secret', () => {
    expect(fingerprintCdmExternalKey('user', 'a', SECRET)).not.toBe(
      fingerprintCdmExternalKey('user', 'b', SECRET)
    );
    expect(fingerprintCdmExternalKey('user', 'a', SECRET)).not.toBe(
      fingerprintCdmExternalKey('user', 'a', `${SECRET}-rotated`)
    );
  });

  it('does not let a kind and a key blur into each other', () => {
    expect(fingerprintCdmExternalKey('a', 'bc', SECRET)).not.toBe(
      fingerprintCdmExternalKey('ab', 'c', SECRET)
    );
  });

  it('has no project input: the project is the column next to it', () => {
    expect(fingerprintCdmExternalKey.length).toBe(3);
  });

  it('is empty without a secret, so nothing can be written or matched', () => {
    expect(fingerprintCdmExternalKey('user', ADDRESS, '')).toBe('');
  });
});

describe('resolveTombstoneKeys', () => {
  it('takes the live membership row marker key, raw, an address included', () => {
    expect(
      resolveTombstoneKeys({}, [{ projectId: projectA, metadata: marker(projectA, ADDRESS) }])
    ).toEqual([{ projectId: projectA, externalKey: ADDRESS }]);
  });

  it("falls back to the global user's marker when it names the project and the row has none", () => {
    expect(
      resolveTombstoneKeys(marker(projectA, 'legacy-17'), [{ projectId: projectA, metadata: {} }])
    ).toEqual([{ projectId: projectA, externalKey: 'legacy-17' }]);
  });

  it('prefers the row key over the global key for the same project', () => {
    expect(
      resolveTombstoneKeys(marker(projectA, 'global-key'), [
        { projectId: projectA, metadata: marker(projectA, 'row-key') },
      ])
    ).toEqual([{ projectId: projectA, externalKey: 'row-key' }]);
  });

  it('keeps the global key when the membership is already gone', () => {
    expect(resolveTombstoneKeys(marker(projectA, 'legacy-17'), [])).toEqual([
      { projectId: projectA, externalKey: 'legacy-17' },
    ]);
  });

  it('yields one key per project, for a user marked in two', () => {
    const keys = resolveTombstoneKeys(marker(projectA, 'global-a'), [
      { projectId: projectA, metadata: marker(projectA, 'row-a') },
      { projectId: projectB, metadata: marker(projectB, 'row-b') },
    ]);
    expect(keys).toEqual([
      { projectId: projectA, externalKey: 'row-a' },
      { projectId: projectB, externalKey: 'row-b' },
    ]);
  });

  it('de-duplicates a project listed twice', () => {
    const keys = resolveTombstoneKeys({}, [
      { projectId: projectA, metadata: marker(projectA, 'k') },
      { projectId: projectA, metadata: marker(projectA, 'k') },
    ]);
    expect(keys).toHaveLength(1);
  });

  it('ignores a marker that names another project or another kind', () => {
    expect(
      resolveTombstoneKeys({}, [
        { projectId: projectA, metadata: marker(projectB, 'k') },
        { projectId: projectB, metadata: marker(projectB, 'k', 'group') },
      ])
    ).toEqual([]);
  });

  it('never takes the importer cdmSource.legacy.id, which is not what the import matches on', () => {
    expect(
      resolveTombstoneKeys({}, [
        { projectId: projectA, metadata: { cdmSource: { legacy: { id: 'legacy-9' } } } },
      ])
    ).toEqual([]);
  });

  it('is empty for a Grant-native user and for malformed metadata', () => {
    expect(resolveTombstoneKeys({}, [{ projectId: projectA, metadata: {} }])).toEqual([]);
    expect(resolveTombstoneKeys(null, [{ projectId: projectA, metadata: null }])).toEqual([]);
    expect(
      resolveTombstoneKeys([], [{ projectId: projectA, metadata: marker(projectA, '') }])
    ).toEqual([]);
    expect(
      resolveTombstoneKeys({}, [{ projectId: projectA, metadata: marker(projectA, 42) }])
    ).toEqual([]);
  });
});

describe('decideTombstoneWrite', () => {
  const keys = [{ projectId: projectA, externalKey: ADDRESS }];
  const decide = (overrides: Partial<Parameters<typeof decideTombstoneWrite>[0]> = {}) =>
    decideTombstoneWrite({
      actorUserId: userId,
      subjectUserId: userId,
      keys,
      fingerprintSecret: SECRET,
      ...overrides,
    });

  it('writes one row per project on a self-deletion, with the fingerprint and no key', () => {
    const decision = decide({
      keys: [...keys, { projectId: projectB, externalKey: 'legacy-17' }],
    });
    expect(decision).toEqual({
      outcome: 'write',
      rows: [
        {
          projectId: projectA,
          kind: CDM_TOMBSTONE_KIND_USER,
          externalKeyFingerprint: fingerprintCdmExternalKey('user', ADDRESS, SECRET),
        },
        {
          projectId: projectB,
          kind: CDM_TOMBSTONE_KIND_USER,
          externalKeyFingerprint: fingerprintCdmExternalKey('user', 'legacy-17', SECRET),
        },
      ],
    });
    const serialized = JSON.stringify(decision);
    expect(serialized).not.toContain(ADDRESS);
    expect(serialized).not.toContain('legacy-17');
    expect(serialized).not.toContain(userId);
  });

  it('writes nothing when an operator deletes someone else', () => {
    expect(decide({ actorUserId: otherUserId })).toEqual({
      outcome: 'skip',
      reason: 'not-self-deletion',
    });
  });

  it('writes nothing when there is no actor', () => {
    expect(decide({ actorUserId: undefined })).toEqual({
      outcome: 'skip',
      reason: 'not-self-deletion',
    });
    expect(decide({ actorUserId: null })).toEqual({
      outcome: 'skip',
      reason: 'not-self-deletion',
    });
  });

  it('writes nothing for a Grant-native user', () => {
    expect(decide({ keys: [] })).toEqual({ outcome: 'skip', reason: 'no-import-key' });
  });

  it('writes nothing, and says why, without the fingerprint secret', () => {
    expect(decide({ fingerprintSecret: '' })).toEqual({
      outcome: 'skip',
      reason: 'no-fingerprint-secret',
    });
  });

  it('puts neither a key nor an address in a skip reason', () => {
    for (const decision of [
      decide({ actorUserId: otherUserId }),
      decide({ keys: [] }),
      decide({ fingerprintSecret: '' }),
    ]) {
      expect(JSON.stringify(decision)).not.toContain(ADDRESS);
    }
  });
});

describe('fingerprintDocumentKeys', () => {
  it('fingerprints each key once, keyed by the key', () => {
    const map = fingerprintDocumentKeys(['a', 'b', 'a'], SECRET);
    expect([...map.keys()]).toEqual(['a', 'b']);
    expect(map.get('a')).toBe(fingerprintCdmExternalKey('user', 'a', SECRET));
  });

  it('is empty without the secret, so the import reads no tombstones', () => {
    expect(fingerprintDocumentKeys(['a', 'b'], '').size).toBe(0);
  });
});

describe('decideUserCreation', () => {
  const fingerprint = fingerprintCdmExternalKey('user', 'k', SECRET);

  it('skips creating an identity whose key a tombstone covers', () => {
    expect(decideUserCreation({ fingerprint, tombstoned: new Set([fingerprint]) })).toBe(
      'skip-tombstoned'
    );
  });

  it('creates an identity no tombstone covers', () => {
    expect(decideUserCreation({ fingerprint, tombstoned: new Set(['other']) })).toBe('create');
    expect(decideUserCreation({ fingerprint, tombstoned: new Set() })).toBe('create');
  });

  it('creates when the key has no fingerprint (no secret), never skips on a guess', () => {
    expect(decideUserCreation({ fingerprint: undefined, tombstoned: new Set(['']) })).toBe(
      'create'
    );
  });
});
