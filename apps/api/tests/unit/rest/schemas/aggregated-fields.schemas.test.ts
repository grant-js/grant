import { Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import {
  getGroupsQuerySchema,
  getPermissionsQuerySchema,
  getRolesQuerySchema,
  getUsersQuerySchema,
} from '@/rest/schemas';

const projectScopeId = '123e4567-e89b-12d3-a456-426614174000';

describe('REST aggregated field query schemas', () => {
  it('accepts computed user fields separately from relations', async () => {
    const query = await getUsersQuerySchema.parseAsync({
      fields: ['primaryTag', 'roleCount', 'permissionCount', 'projectUserApiKeyCount', 'tagCount'],
      relations: ['roles', 'tags'],
      scopeId: projectScopeId,
      tenant: Tenant.AccountProject,
    });

    expect(query.fields).toEqual([
      'primaryTag',
      'roleCount',
      'permissionCount',
      'projectUserApiKeyCount',
      'tagCount',
    ]);
    expect(query.relations).toEqual(['roles', 'tags']);
  });

  it('accepts computed role, group, and permission fields', async () => {
    await expect(
      getRolesQuerySchema.parseAsync({
        fields: ['primaryTag', 'groupCount', 'permissionCount', 'tagCount'],
        scopeId: projectScopeId,
        tenant: Tenant.AccountProject,
      })
    ).resolves.toMatchObject({
      fields: ['primaryTag', 'groupCount', 'permissionCount', 'tagCount'],
    });

    await expect(
      getGroupsQuerySchema.parseAsync({
        fields: ['primaryTag', 'permissionCount', 'tagCount'],
        scopeId: projectScopeId,
        tenant: Tenant.AccountProject,
      })
    ).resolves.toMatchObject({
      fields: ['primaryTag', 'permissionCount', 'tagCount'],
    });

    await expect(
      getPermissionsQuerySchema.parseAsync({
        fields: ['primaryTag', 'tagCount'],
        scopeId: projectScopeId,
        tenant: Tenant.AccountProject,
      })
    ).resolves.toMatchObject({
      fields: ['primaryTag', 'tagCount'],
    });
  });

  it('rejects computed fields on the wrong endpoint', async () => {
    await expect(
      getPermissionsQuerySchema.parseAsync({
        fields: ['roleCount'],
        scopeId: projectScopeId,
        tenant: Tenant.AccountProject,
      })
    ).rejects.toThrow();
  });
});
