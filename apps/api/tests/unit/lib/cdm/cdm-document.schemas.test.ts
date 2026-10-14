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
