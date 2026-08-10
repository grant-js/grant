/**
 * Characterization tests for `seedAll` — the permission-model seed that every
 * environment depends on (CLI `db:seed:permissions` and `bootstrapDatabase`).
 *
 * DB-free: `FakeDb` stands in for the Drizzle query builder. Assertions describe
 * what the seed does *today*; anything surprising is labelled CHARACTERIZATION
 * and reported separately rather than "fixed" here.
 */
import {
  getResourceDefinition,
  getResourceSlugs,
  GROUP_DEFINITIONS,
  PERMISSION_MAPPINGS,
  ROLE_KEYS,
  ROLES,
} from '@grantjs/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { groupPermissions, groups, permissions, resources, roleGroups, roles } from '../schemas';
import { FakeDb } from '../test-support/fake-db';
import { seedAll } from './seed-permissions';

type SeedDb = Parameters<typeof seedAll>[0];

const RESOURCE_COUNT = getResourceSlugs().length;
const UNIQUE_PERMISSION_KEYS = new Set(
  Object.values(PERMISSION_MAPPINGS).flatMap((perms) =>
    perms.map((p) => `${p.resource}:${p.action}`)
  )
);
const GROUP_COUNT = Object.keys(GROUP_DEFINITIONS).length;
const ROLE_COUNT = ROLE_KEYS.length;
const ROLE_GROUP_PAIRS = Object.values(GROUP_DEFINITIONS).reduce(
  (n, g) => n + g.assignedRoles.length,
  0
);
const GROUP_PERMISSION_PAIRS = Object.values(PERMISSION_MAPPINGS).reduce(
  (n, perms) => n + perms.length,
  0
);

let db: FakeDb;

beforeEach(() => {
  db = new FakeDb();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('seedAll — cold run against an empty database', () => {
  it('creates every resource, permission, group, role and association exactly once', async () => {
    const result = await seedAll(db as unknown as SeedDb);

    expect(result).toEqual({
      resources: { created: RESOURCE_COUNT, updated: 0, skipped: 0 },
      permissions: { created: UNIQUE_PERMISSION_KEYS.size, updated: 0, skipped: 0 },
      groups: { created: GROUP_COUNT, updated: 0, skipped: 0 },
      roles: { created: ROLE_COUNT, updated: 0, skipped: 0 },
      roleGroups: { created: ROLE_GROUP_PAIRS, skipped: 0 },
      groupPermissions: { created: GROUP_PERMISSION_PAIRS, skipped: 0 },
    });
    expect(db.updates).toHaveLength(0);
  });

  it('inserts in dependency order: resources → permissions → groups → roles → associations', async () => {
    await seedAll(db as unknown as SeedDb);

    const order = db.inserts.map((i) => i.table);
    const firstIndexOf = (table: string) => order.indexOf(table);

    expect(firstIndexOf('resources')).toBeLessThan(firstIndexOf('permissions'));
    expect(firstIndexOf('permissions')).toBeLessThan(firstIndexOf('groups'));
    expect(firstIndexOf('groups')).toBeLessThan(firstIndexOf('roles'));
    expect(firstIndexOf('roles')).toBeLessThan(firstIndexOf('role_groups'));
    expect(firstIndexOf('role_groups')).toBeLessThan(firstIndexOf('group_permissions'));
  });

  it('never re-selects a row it inserted in the same run (which is what makes the fake faithful)', async () => {
    await seedAll(db as unknown as SeedDb);

    // Each seeded entity is looked up once per distinct key and inserted at most
    // once, so no lookup can depend on an insert from the same run.
    expect(db.insertsFor(resources)).toHaveLength(RESOURCE_COUNT);
    expect(db.insertsFor(permissions)).toHaveLength(UNIQUE_PERMISSION_KEYS.size);
    expect(db.insertsFor(groups)).toHaveLength(GROUP_COUNT);
    expect(db.insertsFor(roles)).toHaveLength(ROLE_COUNT);
  });

  it('writes resource rows straight from the constants definition', async () => {
    await seedAll(db as unknown as SeedDb);

    const slug = getResourceSlugs()[0];
    const definition = getResourceDefinition(slug);
    const row = db.insertsFor(resources).find((i) => i.values.slug === slug);

    expect(row?.values).toMatchObject({
      name: definition.name,
      slug: definition.slug,
      actions: definition.actions,
      isActive: true,
    });
  });

  it('derives i18n permission name/description keys by camelCasing resource and action', async () => {
    await seedAll(db as unknown as SeedDb);

    const names = db.insertsFor(permissions).map((i) => i.values.name as string);

    expect(names).toContain('permissions.names.User.Read');
    expect(names.every((n) => n.startsWith('permissions.names.'))).toBe(true);
    const descriptions = db.insertsFor(permissions).map((i) => i.values.description as string);
    expect(descriptions.every((d) => d.startsWith('permissions.descriptions.'))).toBe(true);
  });

  it('writes role rows using the i18n name key from ROLES', async () => {
    await seedAll(db as unknown as SeedDb);

    const names = db.insertsFor(roles).map((i) => i.values.name);
    expect(names).toEqual(ROLE_KEYS.map((k) => ROLES[k].name));
  });

  it('gives new groups and roles an empty metadata object', async () => {
    await seedAll(db as unknown as SeedDb);

    expect(db.insertsFor(groups).every((i) => JSON.stringify(i.values.metadata) === '{}')).toBe(
      true
    );
    expect(db.insertsFor(roles).every((i) => JSON.stringify(i.values.metadata) === '{}')).toBe(
      true
    );
  });
});

describe('seedAll — idempotency (second run against the rows the first run created)', () => {
  it('creates nothing and updates nothing on a re-run', async () => {
    await seedAll(db as unknown as SeedDb);
    db.beginReplay();
    db.resetRecordings();

    const second = await seedAll(db as unknown as SeedDb);

    expect(db.inserts).toHaveLength(0);
    expect(db.updates).toHaveLength(0);
    expect(second).toEqual({
      resources: { created: 0, updated: 0, skipped: RESOURCE_COUNT },
      permissions: { created: 0, updated: 0, skipped: UNIQUE_PERMISSION_KEYS.size },
      groups: { created: 0, updated: 0, skipped: GROUP_COUNT },
      roles: { created: 0, updated: 0, skipped: ROLE_COUNT },
      roleGroups: { created: 0, skipped: ROLE_GROUP_PAIRS },
      groupPermissions: { created: 0, skipped: GROUP_PERMISSION_PAIRS },
    });
  });

  it('a third run is identical to the second', async () => {
    await seedAll(db as unknown as SeedDb);
    db.beginReplay();
    const second = await seedAll(db as unknown as SeedDb);
    db.beginReplay();
    db.resetRecordings();

    const third = await seedAll(db as unknown as SeedDb);

    expect(third).toEqual(second);
    expect(db.inserts).toHaveLength(0);
  });

  it('updates (not duplicates) a resource whose stored name drifted from the constants', async () => {
    await seedAll(db as unknown as SeedDb);
    db.rows(resources)[0].name = 'Stale Name';
    db.beginReplay();
    db.resetRecordings();

    const second = await seedAll(db as unknown as SeedDb);

    expect(second.resources).toEqual({
      created: 0,
      updated: 1,
      skipped: RESOURCE_COUNT - 1,
    });
    expect(db.insertsFor(resources)).toHaveLength(0);
    expect(db.updatesFor(resources)).toHaveLength(1);
  });

  it('updates a permission whose stored condition drifted', async () => {
    await seedAll(db as unknown as SeedDb);
    db.rows(permissions)[0].condition = { StringEquals: { 'resource.id': 'stale' } };
    db.beginReplay();
    db.resetRecordings();

    const second = await seedAll(db as unknown as SeedDb);

    expect(second.permissions.updated).toBe(1);
    expect(db.updatesFor(permissions)).toHaveLength(1);
  });

  it('CHARACTERIZATION: lookups filter on deletedAt IS NULL, so a soft-deleted row is re-created rather than restored', async () => {
    await seedAll(db as unknown as SeedDb);
    // Simulate soft-deletion by removing the row from what lookups can see.
    const stored = db.rows(resources);
    stored.shift();
    db.beginReplay();
    db.resetRecordings();

    const second = await seedAll(db as unknown as SeedDb);

    // The seed inserts a fresh row for the slug it can no longer find.
    expect(second.resources.created).toBeGreaterThan(0);
    expect(db.insertsFor(resources).length).toBeGreaterThan(0);
  });
});

describe('seedAll — permission de-duplication across groups', () => {
  it('collapses each resource:action to a single permission row shared by every group that declares it', async () => {
    await seedAll(db as unknown as SeedDb);

    expect(db.insertsFor(permissions)).toHaveLength(UNIQUE_PERMISSION_KEYS.size);
    expect(db.insertsFor(groupPermissions)).toHaveLength(GROUP_PERMISSION_PAIRS);
    expect(GROUP_PERMISSION_PAIRS).toBeGreaterThan(UNIQUE_PERMISSION_KEYS.size);
  });

  it('CHARACTERIZATION: when two groups declare the same resource:action with different conditions, the first-iterated group wins and the other condition is silently dropped', async () => {
    const conflicts = new Map<string, { group: string; condition: string }[]>();
    for (const [group, perms] of Object.entries(PERMISSION_MAPPINGS)) {
      for (const p of perms) {
        const key = `${p.resource}:${p.action}`;
        const condition = p.condition ? JSON.stringify(p.condition) : 'null';
        const bucket = conflicts.get(key);
        if (bucket) bucket.push({ group, condition });
        else conflicts.set(key, [{ group, condition }]);
      }
    }
    const conflicting = [...conflicts.entries()].filter(
      ([, entries]) => new Set(entries.map((e) => e.condition)).size > 1
    );

    // Pinned: this is the count of resource:action pairs whose declared
    // conditions disagree between groups. See findings — the seed cannot
    // represent a per-group condition.
    expect(conflicting.map(([key]) => key).sort()).toEqual([
      'ApiKey:Delete',
      'ApiKey:Revoke',
      'Project:Delete',
      'Project:Update',
      'Tag:Delete',
      'Tag:Update',
    ]);

    await seedAll(db as unknown as SeedDb);

    for (const [key, entries] of conflicting) {
      const [resource, action] = key.split(':');
      const resourceRow = db.rows(resources).find((r) => r.slug === resource) as Record<
        string,
        unknown
      >;
      const stored = db
        .insertsFor(permissions)
        .find((i) => i.values.action === action && i.values.resourceId === resourceRow.id);

      const winner = entries[0].condition;
      expect(JSON.stringify(stored?.values.condition ?? null)).toBe(winner);
      // Every other declaration for this key was discarded.
      expect(entries.some((e) => e.condition !== winner)).toBe(true);
    }
  });

  it('CHARACTERIZATION: ApiKey:Delete/Revoke resolve to the UNCONDITIONAL row, so the APIKeyDev condition (own keys only) is not persisted', async () => {
    await seedAll(db as unknown as SeedDb);

    const apiKeyResource = db.rows(resources).find((r) => r.slug === 'ApiKey') as Record<
      string,
      unknown
    >;
    const stored = db
      .insertsFor(permissions)
      .filter(
        (i) =>
          i.values.resourceId === apiKeyResource.id &&
          (i.values.action === 'Delete' || i.values.action === 'Revoke')
      );

    expect(stored).toHaveLength(2);
    for (const row of stored) {
      expect(row.values.condition ?? null).toBeNull();
    }

    // The APIKeyDev group nevertheless declares a restricting condition...
    const devDeclared = PERMISSION_MAPPINGS['APIKeyDev']?.find(
      (p) => p.resource === 'ApiKey' && p.action === 'Delete'
    );
    expect(devDeclared?.condition).toEqual({
      StringEquals: { 'resource.createdBy': '{{user.id}}' },
    });
    // ...and the APIKeyDev group is still linked to the unconditional row, which is
    // what makes the dropped condition reachable rather than merely cosmetic.
    const devGroup = db.rows(groups).find((g) => g.name === GROUP_DEFINITIONS['APIKeyDev']?.name);
    const deleteRow = db
      .rows(permissions)
      .find((p) => p.resourceId === apiKeyResource.id && p.action === 'Delete');
    const link = db
      .insertsFor(groupPermissions)
      .filter((i) => i.values.groupId === devGroup?.id && i.values.permissionId === deleteRow?.id);

    expect(devGroup).toBeDefined();
    expect(deleteRow?.condition ?? null).toBeNull();
    expect(link).toHaveLength(1);
  });

  it('CHARACTERIZATION: Project/Tag Update+Delete resolve to the SCOPED AccountProjectOwner condition, which then applies to ProjectOwner/TagOwner too', async () => {
    await seedAll(db as unknown as SeedDb);

    const projectResource = db.rows(resources).find((r) => r.slug === 'Project') as Record<
      string,
      unknown
    >;
    const stored = db
      .insertsFor(permissions)
      .filter(
        (i) =>
          i.values.resourceId === projectResource.id &&
          (i.values.action === 'Update' || i.values.action === 'Delete')
      );

    expect(stored).toHaveLength(2);
    for (const row of stored) {
      expect(row.values.condition).toEqual({
        In: { 'resource.id': '{{resource.scope.projects}}' },
      });
    }

    // ProjectOwner declared no condition for the same action.
    const ownerDeclared = PERMISSION_MAPPINGS['ProjectOwner']?.find(
      (p) => p.resource === 'Project' && p.action === 'Update'
    );
    expect(ownerDeclared).toBeDefined();
    expect(ownerDeclared?.condition ?? null).toBeNull();
  });
});

describe('seedAll — groups with no permission mappings', () => {
  it('CHARACTERIZATION: creates groups that appear in GROUP_DEFINITIONS but in no PERMISSION_MAPPINGS entry, leaving them with zero permissions', async () => {
    await seedAll(db as unknown as SeedDb);

    const withoutMappings = Object.keys(GROUP_DEFINITIONS).filter(
      (g) => !(g in PERMISSION_MAPPINGS)
    );

    expect(withoutMappings.length).toBeGreaterThan(0);
    expect(withoutMappings).toContain('UserSessionOwner');
    // They are still created and still linked to roles...
    expect(db.insertsFor(groups)).toHaveLength(GROUP_COUNT);
    expect(db.insertsFor(roleGroups)).toHaveLength(ROLE_GROUP_PAIRS);
    // ...but they receive no group_permissions rows at all.
    const emptyGroupIds = db
      .rows(groups)
      .filter((row) => withoutMappings.some((key) => GROUP_DEFINITIONS[key].name === row.name))
      .map((row) => row.id);
    const linkedGroupIds = new Set(db.insertsFor(groupPermissions).map((i) => i.values.groupId));
    for (const id of emptyGroupIds) {
      expect(linkedGroupIds.has(id)).toBe(false);
    }
  });

  it('emits no warnings for the constants shipped today', async () => {
    await seedAll(db as unknown as SeedDb);

    expect(console.warn).not.toHaveBeenCalled();
  });
});
