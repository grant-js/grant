import { CdmFindBy, CdmModeStrategy } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import {
  countCdmEntities,
  parseCdmDocument,
  validateSyncInput,
} from '@/lib/cdm/cdm-document.schemas';
import { ValidationError } from '@/lib/errors';
import { startProjectSyncRequestSchema } from '@/rest/schemas/projects.schemas';

const merge = { strategy: CdmModeStrategy.Merge, onConflict: null, confirmDestructive: false };
const scope = {
  tenant: 'accountProject',
  id: '00000000-0000-4000-8000-000000000020:00000000-0000-4000-8000-000000000011',
};

function document(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    mode: merge,
    roles: [{ key: 'viewer', name: 'Viewer', searchable: ['viewer@example.com'] }],
    users: [
      {
        key: { value: 'a@example.com', findBy: CdmFindBy.Email },
        name: 'A',
        searchable: { email: 'a@example.com' },
      },
    ],
    groups: [{ key: 'g', name: 'G', searchable: { legacyId: '7' } }],
    ...overrides,
  };
}

describe('the shared CDM document schema', () => {
  it('keeps `searchable` on groups, roles and users', () => {
    // The REST body schema used to drop it silently (zod strips unknown keys) while the
    // GraphQL input kept it, so the same document imported differently by transport.
    const parsed = parseCdmDocument(document());

    expect(parsed.roles[0]?.searchable).toEqual(['viewer@example.com']);
    expect(parsed.users[0]?.searchable).toEqual({ email: 'a@example.com' });
    expect(parsed.groups?.[0]?.searchable).toEqual({ legacyId: '7' });
  });

  it('keeps `searchable` through the REST body schema as well', () => {
    const result = startProjectSyncRequestSchema.parse({ scope, ...document() });

    expect(result.roles?.[0]?.searchable).toEqual(['viewer@example.com']);
    expect(result.users?.[0]?.searchable).toEqual({ email: 'a@example.com' });
    expect(result.groups?.[0]?.searchable).toEqual({ legacyId: '7' });
  });

  it('rejects a replace document that did not confirm the destruction', () => {
    expect(() =>
      parseCdmDocument(document({ mode: { strategy: CdmModeStrategy.Replace } }))
    ).toThrow(/confirmDestructive/);
  });

  it('names the paths of what is wrong, and says how much more there is', () => {
    const users = Array.from({ length: 30 }, () => ({ key: { value: '' }, name: '' }));

    let error: unknown;
    try {
      parseCdmDocument(document({ users }));
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ValidationError);
    const message = (error as ValidationError).message;
    expect(message).toContain('users.0.key.value');
    expect(message).toMatch(/and \d+ more/);
    expect((error as ValidationError).violations).toHaveLength(20);
  });

  it('refuses something that is not a document at all', () => {
    expect(() => parseCdmDocument(null)).toThrow(ValidationError);
    expect(() => parseCdmDocument([])).toThrow(ValidationError);
    expect(() => parseCdmDocument({})).toThrow(ValidationError);
  });
});

describe('validateSyncInput', () => {
  const base = { version: 1, mode: merge, roles: [], users: [] };

  it('accepts a minimal document', () => {
    expect(() => validateSyncInput(base)).not.toThrow();
  });

  it('refuses an unsupported version', () => {
    expect(() => validateSyncInput({ ...base, version: 2 })).toThrow(/Unsupported version/);
  });

  it('refuses replace without confirmation', () => {
    expect(() =>
      validateSyncInput({ ...base, mode: { strategy: 'replace', confirmDestructive: false } })
    ).toThrow(/confirmDestructive/);
  });

  it('refuses a duplicate role key', () => {
    expect(() => validateSyncInput({ ...base, roles: [{ key: 'r' }, { key: 'r' }] })).toThrow(
      /Duplicate role key: r/
    );
  });

  it('refuses a duplicate user, by id or by key', () => {
    const id = { key: { value: 'u1', findBy: 'id' } };
    const key = { key: { value: 'u2', findBy: 'email' } };

    expect(() => validateSyncInput({ ...base, users: [id, id] })).toThrow(/Duplicate user entry/);
    expect(() => validateSyncInput({ ...base, users: [key, key] })).toThrow(/Duplicate user entry/);
    expect(() => validateSyncInput({ ...base, users: [id, key] })).not.toThrow();
  });

  it('names the position and never the value when asked to redact user keys', () => {
    const dup = { key: { value: 'jane.doe@example.com', findBy: 'email' } };

    expect(() =>
      validateSyncInput({ ...base, users: [dup, dup] }, { redactUserKeys: true })
    ).toThrow('Duplicate user key at users[1]');
    // Not redacted by default: the inline 400 keeps telling the caller which entry it is.
    expect(() => validateSyncInput({ ...base, users: [dup, dup] })).toThrow(
      /jane\.doe@example\.com/
    );
  });
});

describe('key.grantUserId', () => {
  const base = { version: 1, mode: merge, roles: [] };
  const GRANT_USER_ID = '30000000-0000-4000-8000-000000000001';
  const user = (
    findBy: string | undefined,
    grantUserId: string | null | undefined,
    value = 'jane.doe@example.com'
  ) => ({
    key: { value, findBy, grantUserId },
  });

  it('is accepted with findBy key, or with no findBy', () => {
    expect(() =>
      validateSyncInput({
        ...base,
        users: [user(CdmFindBy.Key, GRANT_USER_ID, 'u1'), user(undefined, GRANT_USER_ID, 'u2')],
      })
    ).not.toThrow();
  });

  it('is ignored when absent or null', () => {
    expect(() =>
      validateSyncInput({
        ...base,
        users: [user(CdmFindBy.Email, null, 'a@example.com'), user(CdmFindBy.Id, undefined, 'u2')],
      })
    ).not.toThrow();
  });

  it.each([CdmFindBy.Email, CdmFindBy.Id, CdmFindBy.Name, CdmFindBy.Slug])(
    'is refused with findBy %s, naming the position and neither the key nor the id',
    (findBy) => {
      let message = '';
      try {
        validateSyncInput({
          ...base,
          users: [
            user(CdmFindBy.Key, null, 'u0'),
            user(findBy, GRANT_USER_ID, 'jane.doe@example.com'),
          ],
        });
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toBe("users[1]: grantUserId is only allowed with key.findBy 'key'");
      expect(message).not.toContain('jane.doe');
      expect(message).not.toContain(GRANT_USER_ID);
    }
  );

  it('is refused when it is not a UUID (GraphQL types it as ID), without echoing it', () => {
    let message = '';
    try {
      validateSyncInput({ ...base, users: [user(CdmFindBy.Key, 'not-a-uuid-secret', 'u1')] });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toBe('users[0]: grantUserId must be a UUID');
  });

  it('survives the shared schema and the REST body schema', () => {
    const doc = document({
      users: [
        { key: { value: 'u1', findBy: CdmFindBy.Key, grantUserId: GRANT_USER_ID }, name: 'A' },
      ],
    });
    expect(parseCdmDocument(doc).users[0]?.key.grantUserId).toBe(GRANT_USER_ID);
    expect(startProjectSyncRequestSchema.parse({ scope, ...doc }).users?.[0]?.key.grantUserId).toBe(
      GRANT_USER_ID
    );
  });

  it('is refused by the shared schema when it is not a UUID', () => {
    const doc = document({
      users: [{ key: { value: 'u1', findBy: CdmFindBy.Key, grantUserId: 'nope' }, name: 'A' }],
    });
    expect(() => parseCdmDocument(doc)).toThrow(ValidationError);
    expect(startProjectSyncRequestSchema.safeParse({ scope, ...doc }).success).toBe(false);
  });
});

describe('countCdmEntities', () => {
  it('counts roles, users, resources, permissions, groups and tags', () => {
    expect(
      countCdmEntities({
        roles: [1, 2],
        users: [1, 2, 3],
        resources: [1],
        permissions: [1, 2, 3, 4],
        groups: [1],
        tags: [1, 2],
      })
    ).toBe(13);
  });

  it('treats an absent or null collection as empty', () => {
    expect(countCdmEntities({ roles: null, users: undefined })).toBe(0);
  });

  it('does not count api keys or links', () => {
    expect(countCdmEntities({ users: [{ apiKeys: [1, 2, 3] }], roles: [{ groups: [1, 2] }] })).toBe(
      2
    );
  });
});

describe('the REST start body, one endpoint and two shapes', () => {
  const source = { uploadId: '123e4567-e89b-42d3-a456-426614174077', entityCount: 10 };

  it('accepts the inline shape exactly as before', () => {
    expect(startProjectSyncRequestSchema.safeParse({ scope, ...document() }).success).toBe(true);
  });

  it('still requires version, roles and users when there is no source', () => {
    const result = startProjectSyncRequestSchema.safeParse({ scope, mode: merge });

    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join('.')) ?? [];
    expect(paths).toEqual(expect.arrayContaining(['version', 'roles', 'users']));
  });

  it('accepts a by-reference body that carries only mode and source', () => {
    const result = startProjectSyncRequestSchema.safeParse({ scope, mode: merge, source });

    expect(result.success).toBe(true);
  });

  it('accepts a by-reference body with an optional version and job name', () => {
    expect(
      startProjectSyncRequestSchema.safeParse({
        scope,
        mode: merge,
        version: 1,
        id: 'nightly',
        source: { uploadId: source.uploadId },
      }).success
    ).toBe(true);
  });

  it.each(['roles', 'users', 'resources', 'permissions', 'groups', 'tags'])(
    'refuses `%s` beside a source, even when empty',
    (field) => {
      const result = startProjectSyncRequestSchema.safeParse({
        scope,
        mode: merge,
        source,
        [field]: [],
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual([field]);
    }
  );

  it('refuses an entity count the integer column cannot hold, so it is a 400 and not a 500', () => {
    const body = (entityCount: number) => ({
      scope,
      mode: merge,
      source: { uploadId: source.uploadId, entityCount },
    });

    expect(startProjectSyncRequestSchema.safeParse(body(2_147_483_647)).success).toBe(true);
    expect(startProjectSyncRequestSchema.safeParse(body(2_147_483_648)).success).toBe(false);
    expect(startProjectSyncRequestSchema.safeParse(body(-1)).success).toBe(false);
  });

  it('refuses an upload id that is not a uuid', () => {
    expect(
      startProjectSyncRequestSchema.safeParse({
        scope,
        mode: merge,
        source: { uploadId: '../../users/1/avatar.png' },
      }).success
    ).toBe(false);
  });

  it('still refuses replace without confirmation, by reference too', () => {
    expect(
      startProjectSyncRequestSchema.safeParse({
        scope,
        mode: { strategy: CdmModeStrategy.Replace },
        source,
      }).success
    ).toBe(false);
  });
});

describe('imported password credentials', () => {
  const GO_HASH = '$2a$10$NnYC771KbJNAJLrrFr5PD.A0KJg1eS9vxvLCiZyJ2WYfW6tAS6tzG';
  const withPassword = (password: unknown, findBy: string = CdmFindBy.Email) =>
    document({
      users: [{ key: { value: 'a@example.com', findBy }, name: 'A', password }],
    });

  function messageOf(fn: () => unknown): string {
    try {
      fn();
    } catch (error) {
      return (error as Error).message;
    }
    throw new Error('expected a refusal');
  }

  it('accepts a bcrypt password through the shared schema and the REST body schema', () => {
    const password = { algorithm: 'bcrypt', hash: GO_HASH };

    expect(parseCdmDocument(withPassword(password)).users[0]?.password).toEqual(password);
    expect(
      startProjectSyncRequestSchema.parse({ scope, ...withPassword(password) }).users?.[0]?.password
    ).toEqual(password);
  });

  it('accepts a null password, as GraphQL clients send for an unset input', () => {
    expect(() => parseCdmDocument(withPassword(null))).not.toThrow();
  });

  it.each([
    ['an unknown algorithm', { algorithm: 'argon2id', hash: GO_HASH }],
    ['a plaintext password in the hash field', { algorithm: 'bcrypt', hash: 'Legacy-Passw0rd!' }],
    ['a cost below the floor', { algorithm: 'bcrypt', hash: `$2a$03$${GO_HASH.slice(7)}` }],
    ['a cost above the ceiling', { algorithm: 'bcrypt', hash: `$2a$16$${GO_HASH.slice(7)}` }],
    ['a truncated hash', { algorithm: 'bcrypt', hash: GO_HASH.slice(0, -2) }],
    ['a non-string hash', { algorithm: 'bcrypt', hash: 12345 }],
    ['a missing hash', { algorithm: 'bcrypt' }],
  ])('refuses %s without echoing the hash', (_label, password) => {
    const viaDocument = messageOf(() => parseCdmDocument(withPassword(password)));
    const restResult = startProjectSyncRequestSchema.safeParse({
      scope,
      ...withPassword(password),
    });

    expect(restResult.success).toBe(false);
    for (const message of [viaDocument, JSON.stringify(restResult.error?.issues)]) {
      expect(message).toContain('password');
      expect(message).not.toContain(GO_HASH);
      expect(message).not.toContain(GO_HASH.slice(7));
      expect(message).not.toContain('Legacy-Passw0rd!');
    }
  });

  describe('validateSyncInput (GraphQL and the worker, where zod has not looked)', () => {
    const base = { version: 1, mode: merge, roles: [] };
    const user = (
      password: { algorithm?: unknown; hash?: unknown } | null | undefined,
      findBy: string,
      value = 'jane.doe@example.com'
    ) => ({
      key: { value, findBy },
      password,
    });

    it('accepts a valid bcrypt credential on an email-identified user', () => {
      expect(() =>
        validateSyncInput({
          ...base,
          users: [user({ algorithm: 'bcrypt', hash: GO_HASH }, 'email')],
        })
      ).not.toThrow();
    });

    it.each(['key', 'id', 'name', 'slug', undefined])(
      'refuses a password on a user identified by %s',
      (findBy) => {
        const message = messageOf(() =>
          validateSyncInput({
            ...base,
            users: [user({ algorithm: 'bcrypt', hash: GO_HASH }, findBy as string)],
          })
        );

        expect(message).toMatch(/users\[0\]: password is only allowed with key.findBy 'email'/);
        expect(message).not.toContain(GO_HASH);
        expect(message).not.toContain('jane.doe@example.com');
      }
    );

    it.each([
      { algorithm: 'md5', hash: GO_HASH },
      { algorithm: 'bcrypt', hash: 'not-a-hash' },
      { algorithm: 'bcrypt', hash: `$2a$99$${GO_HASH.slice(7)}` },
    ])('refuses a bad credential, naming the position only', (password) => {
      const message = messageOf(() =>
        validateSyncInput({ ...base, users: [user(password, 'email')] })
      );

      expect(message).toMatch(/^users\[0\]: password\./);
      expect(message).not.toContain(GO_HASH);
      expect(message).not.toContain('jane.doe@example.com');
    });

    it('ignores an absent or null password', () => {
      expect(() =>
        validateSyncInput({ ...base, users: [user(undefined, 'key', 'a'), user(null, 'key', 'b')] })
      ).not.toThrow();
    });
  });
});
