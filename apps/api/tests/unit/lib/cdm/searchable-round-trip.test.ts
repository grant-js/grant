import type { SyncProjectInput } from '@grantjs/schema';
import { CdmFindBy, CdmModeStrategy } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { assembleExportedSyncProjectInput } from '@/lib/cdm/cdm-export-assemble.lib';
import { expandCdmSyncInput } from '@/lib/cdm/expand-cdm-sync-input.lib';

describe('CDM searchable round-trip', () => {
  it('preserves searchable through expand and assemble', () => {
    const input: SyncProjectInput = {
      version: 1,
      mode: { strategy: CdmModeStrategy.Merge },
      roles: [
        {
          key: 'role-1',
          name: 'Admin',
          permissions: ['perm-1'],
          searchable: { legacyId: 'role-1', displayLabel: 'Admin' },
        },
      ],
      users: [
        {
          key: { value: 'user-1', findBy: CdmFindBy.Key },
          name: 'Benhur',
          roles: ['role-1'],
          searchable: { email: 'ben+cs@example.com', legacyId: 'user-1' },
        },
      ],
      resources: [
        {
          key: 'res-1',
          name: 'Policy',
          actions: ['read'],
        },
      ],
      permissions: [
        {
          key: 'perm-1',
          resource: 'res-1',
          action: 'read',
          name: 'Read policy',
        },
      ],
      groups: [
        {
          key: 'group-1',
          name: 'Partner group',
          permissions: ['perm-1'],
          searchable: { legacyId: 'group-1', partnerId: 'p-1' },
        },
      ],
      tags: [],
    };

    const expanded = expandCdmSyncInput(input);
    expect(expanded.roleTemplates[0]?.searchable).toEqual({
      legacyId: 'role-1',
      displayLabel: 'Admin',
    });
    expect(expanded.userAssignments[0]?.searchable).toEqual({
      email: 'ben+cs@example.com',
      legacyId: 'user-1',
    });

    const assembled = assembleExportedSyncProjectInput({
      roleTemplates: expanded.roleTemplates.map((rt) => ({
        ...rt,
        linkedGrantGroup: {
          grantGroupId: 'g1',
          groupKey: 'group-1',
          groupName: 'Partner group',
          groupDescription: null,
          permissionKeys: ['perm-1'],
          tagKeys: [],
          primaryGroupTagKey: null,
          searchable: { legacyId: 'group-1', partnerId: 'p-1' },
        },
      })),
      userAssignments: expanded.userAssignments,
      projectUserApiKeys: [],
      provisionedUsers: expanded.provisionedUsers,
      resourcesSlice: input.resources ?? [],
      permissionsSlice: input.permissions ?? [],
      tagsSlice: [],
    });

    expect(assembled.users[0]?.searchable).toEqual({
      email: 'ben+cs@example.com',
      legacyId: 'user-1',
    });
    expect(assembled.roles[0]?.searchable).toEqual({
      legacyId: 'role-1',
      displayLabel: 'Admin',
    });
    expect(assembled.groups?.[0]?.searchable).toEqual({
      legacyId: 'group-1',
      partnerId: 'p-1',
    });
  });
});
