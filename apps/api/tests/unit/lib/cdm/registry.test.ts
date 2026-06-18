/**
 * Pins the default CDM handler registry order.
 *
 * Order matters:
 * - resource(2) → permission(4): permissions resolve `resourceKey` against the
 *   resource.cdm-entity's `produced.resourceIds`.
 * - permission(4) → tag(5) / roleTemplate(10) / userAssignment(20): the role-
 *   template + user-assignment.cdm-entitys resolve `permissionKey` against the
 *   permission.cdm-entity's `produced.permissionIds`.
 * - tag(5) → roleTemplate(10) / userAssignment(20): role-templates +
 *   user-assignments resolve `tagKeys` / `groupTagKeys` against
 *   `produced.tagIds`.
 * - user(15) runs before userAssignment(20) so `produced.userIds`
 *   is populated for `userKey` references.
 * - projectUserApiKey(300) runs last because it depends on
 *   user assignments (`assignmentUserIds` gate).
 */
import { describe, expect, it, vi } from 'vitest';

import { CdmEntityRegistryDeps, createDefaultCdmEntities } from '@/lib/cdm';

function buildDeps(): CdmEntityRegistryDeps {
  const stub = vi.fn();
  return {
    importRepo: stub as never,
    exportRepo: stub as never,
    roles: stub as never,
    groups: stub as never,
    roleGroups: stub as never,
    rolePermissions: stub as never,
    groupPermissions: stub as never,
    userPermissions: stub as never,
    userGroups: stub as never,
    projectRoles: stub as never,
    projectRolePermissions: stub as never,
    projectUserPermissions: stub as never,
    projectUserGroups: stub as never,
    projectGroups: stub as never,
    projectPermissions: stub as never,
    projectResources: stub as never,
    projectUsers: stub as never,
    userRoles: stub as never,
    apiKeys: stub as never,
    projectUserApiKeys: stub as never,
    tags: stub as never,
    projectTags: stub as never,
    roleTags: stub as never,
    groupTags: stub as never,
    userTags: stub as never,
    resources: stub as never,
    permissions: stub as never,
    users: stub as never,
    userAuthenticationMethods: stub as never,
    userRepository: stub as never,
  };
}

describe('createDefaultCdmEntities', () => {
  it('registers resource(2), permission(4), tag(5), roleTemplate(10), user(15), userAssignment(20), projectUserApiKey(300) in ascending order', () => {
    const handlers = createDefaultCdmEntities(buildDeps());
    const orders = handlers.map((h) => ({ kind: h.handlerKind, order: h.order }));
    expect(orders).toEqual([
      { kind: 'resource', order: 2 },
      { kind: 'permission', order: 4 },
      { kind: 'tag', order: 5 },
      { kind: 'roleTemplate', order: 10 },
      { kind: 'user', order: 15 },
      { kind: 'userAssignment', order: 20 },
      { kind: 'projectUserApiKey', order: 300 },
    ]);
  });

  it('returns a frozen array (registry is immutable mid-pipeline)', () => {
    const handlers = createDefaultCdmEntities(buildDeps());
    expect(Object.isFrozen(handlers)).toBe(true);
  });

  it('each handler maps to its expanded CDM handler slice key', () => {
    const handlers = createDefaultCdmEntities(buildDeps());
    const byKind = Object.fromEntries(handlers.map((h) => [h.handlerKind, h.inputKey]));
    expect(byKind).toEqual({
      resource: 'resources',
      permission: 'permissions',
      tag: 'tags',
      roleTemplate: 'roleTemplates',
      user: 'provisionedUsers',
      userAssignment: 'userAssignments',
      projectUserApiKey: 'projectUserApiKeys',
    });
  });
});
