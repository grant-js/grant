import { CdmFindBy } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { assembleExportedSyncProjectInput } from '@/lib/cdm/cdm-export-assemble.lib';

describe('assembleExportedSyncProjectInput direct grants', () => {
  it('maps direct user permissions and groups; merges standalone document groups', () => {
    const assembled = assembleExportedSyncProjectInput({
      roleTemplates: [],
      userAssignments: [
        {
          userId: 'u-1',
          roleTemplateKeys: [],
          directGroupKeys: ['g-standalone'],
          directPermissionRefs: [
            {
              resourceSlug: 'doc',
              action: 'read',
              permissionKey: null,
              permissionId: null,
              condition: null,
            },
          ],
          exportDocumentGroups: [
            {
              grantGroupId: 'gid-1',
              groupKey: 'g-standalone',
              groupName: 'Standalone',
              groupDescription: null,
              permissionKeys: ['p1'],
              tagKeys: [],
              primaryGroupTagKey: null,
            },
          ],
        },
      ],
      projectUserApiKeys: [],
      provisionedUsers: [],
      resourcesSlice: [],
      permissionsSlice: [],
      tagsSlice: [],
    });

    expect(assembled.users).toEqual([
      expect.objectContaining({
        key: { value: 'u-1', findBy: CdmFindBy.Id },
        roles: [],
        groups: ['g-standalone'],
        permissions: ['doc:read'],
      }),
    ]);
    expect(assembled.groups).toEqual([
      expect.objectContaining({
        key: 'g-standalone',
        name: 'Standalone',
        permissions: ['p1'],
      }),
    ]);
  });
});
