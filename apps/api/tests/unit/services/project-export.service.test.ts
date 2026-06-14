/**
 * Unit tests for ProjectExportService.
 *
 * Mocks handlers to pin orchestration: canonical `SyncProjectInput`
 * is assembled from internal handler slices (`roleTemplates`, `userAssignments`, …).
 */
import type { CdmExportContext, CdmPermissionRefSpec, ICdmEntityHandler } from '@grantjs/core';
import {
  CdmFindBy,
  type CdmHandlerInputKey,
  CdmModeStrategy,
  CdmOnConflict,
  type Scope,
  Tenant,
} from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import type { ProjectExportRepository } from '@/repositories/project-export.repository';
import { ProjectExportService } from '@/services/project-export.service';

const accountId = '10000000-0000-4000-8000-000000000020';
const projectId = '10000000-0000-4000-8000-000000000011';
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };

function stubHandler(
  inputKey: CdmHandlerInputKey,
  exported: readonly unknown[]
): ICdmEntityHandler {
  return {
    handlerKind: String(inputKey),
    inputKey,
    order: 100,
    validateInput: vi.fn(),
    collectPermissionRefs: vi.fn(() => [] as readonly CdmPermissionRefSpec[]),
    teardown: vi.fn(),
    apply: vi.fn(),
    export: vi.fn(async (_ctx: CdmExportContext) => exported),
  };
}

function buildService(
  handlers: ReadonlyArray<ICdmEntityHandler>,
  options?: {
    getProjectNameForCdmDocument?: ProjectExportRepository['getProjectNameForCdmDocument'];
  }
) {
  const getProjectNameForCdmDocument =
    options?.getProjectNameForCdmDocument ?? vi.fn().mockResolvedValue('Test project');
  return new ProjectExportService(
    {} as never,
    { getProjectNameForCdmDocument } as unknown as ProjectExportRepository,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    handlers
  );
}

describe('ProjectExportService', () => {
  it('merges handler exports into canonical roles and users', async () => {
    const roleTemplate = stubHandler('roleTemplates', [
      {
        externalKey: 'role-1',
        name: 'Existing role',
        description: null,
        permissionRefs: [{ resourceSlug: 'Tag', action: 'Query', permissionId: 'p-1' }],
        metadata: null,
      },
    ]);
    const userAssignment = stubHandler('userAssignments', [
      {
        userId: 'u-1',
        roleTemplateKeys: ['role-1'],
        directPermissionRefs: [],
        metadata: null,
      },
    ]);
    const provisioned = stubHandler('provisionedUsers', []);
    const keys = stubHandler('projectUserApiKeys', []);

    const svc = buildService([roleTemplate, userAssignment, provisioned, keys]);
    const out = await svc.exportProjectCdm({
      projectId,
      scope,
      version: 1,
    });

    expect(out.version).toBe(1);
    expect(out.id).toBe('Test project');
    expect(out.roles).toEqual([
      expect.objectContaining({ key: 'role-1', name: 'Existing role', permissions: ['tag:query'] }),
    ]);
    expect(out.users).toEqual([
      expect.objectContaining({
        key: { value: 'u-1', findBy: CdmFindBy.Id },
        roles: ['role-1'],
      }),
    ]);

    expect(roleTemplate.export).toHaveBeenCalledWith(expect.objectContaining({ projectId, scope }));
    expect(userAssignment.export).toHaveBeenCalledWith(
      expect.objectContaining({ projectId, scope })
    );
  });

  it('maps directPermissionRefs to users.permissions', async () => {
    const userAssignment = stubHandler('userAssignments', [
      {
        userId: 'u-2',
        roleTemplateKeys: [],
        directPermissionRefs: [
          {
            resourceSlug: 'project',
            action: 'update',
            permissionKey: null,
            permissionId: null,
            condition: null,
          },
        ],
        metadata: null,
      },
    ]);
    const provisioned = stubHandler('provisionedUsers', []);
    const keys = stubHandler('projectUserApiKeys', []);

    const svc = buildService([userAssignment, provisioned, keys]);
    const out = await svc.exportProjectCdm({ projectId, scope, version: 1 });

    expect(out.users).toEqual([
      expect.objectContaining({
        key: { value: 'u-2', findBy: CdmFindBy.Id },
        roles: [],
        permissions: ['project:update'],
      }),
    ]);
  });

  it('embeds custom mode in the exported SyncProjectInput', async () => {
    const svc = buildService([stubHandler('roleTemplates', [])]);
    const out = await svc.exportProjectCdm({
      projectId,
      scope,
      version: 1,
      mode: {
        strategy: 'replace',
        onConflict: 'fail',
        confirmDestructive: true,
      },
    });
    expect(out.mode).toEqual({
      strategy: CdmModeStrategy.Replace,
      onConflict: CdmOnConflict.Fail,
      confirmDestructive: true,
    });
  });

  it('sets SyncProjectInput.id to the project display name (CDM id / sync jobName)', async () => {
    const getProjectNameForCdmDocument = vi.fn().mockResolvedValue('Acme rollout');
    const svc = buildService([stubHandler('roleTemplates', [])], { getProjectNameForCdmDocument });
    const out = await svc.exportProjectCdm({ projectId, scope, version: 1 });
    expect(getProjectNameForCdmDocument).toHaveBeenCalledWith(projectId, undefined);
    expect(out.id).toBe('Acme rollout');
  });

  it('sets id to null when the project has no usable display name', async () => {
    const getProjectNameForCdmDocument = vi.fn().mockResolvedValue(null);
    const svc = buildService([stubHandler('roleTemplates', [])], { getProjectNameForCdmDocument });
    const out = await svc.exportProjectCdm({ projectId, scope, version: 1 });
    expect(out.id).toBeNull();
  });

  it('passes the supplied transaction through to each handler.export', async () => {
    const roleTemplate = stubHandler('roleTemplates', []);
    const userAssignment = stubHandler('userAssignments', []);
    const provisioned = stubHandler('provisionedUsers', []);
    const keys = stubHandler('projectUserApiKeys', []);

    const getProjectNameForCdmDocument = vi.fn().mockResolvedValue('Tx project');
    const svc = buildService([roleTemplate, userAssignment, provisioned, keys], {
      getProjectNameForCdmDocument,
    });
    const tx = { __mockTx: true };
    await svc.exportProjectCdm({ projectId, scope, version: 1 }, tx);

    expect(getProjectNameForCdmDocument).toHaveBeenCalledWith(projectId, tx);
    expect(roleTemplate.export).toHaveBeenCalledWith(expect.objectContaining({ tx }));
    expect(userAssignment.export).toHaveBeenCalledWith(expect.objectContaining({ tx }));
  });

  it('rejects with ValidationError when scope is not project-scoped', async () => {
    const svc = buildService([stubHandler('roleTemplates', [])]);
    await expect(
      svc.exportProjectCdm({
        projectId,
        scope: { tenant: Tenant.Account, id: accountId },
        version: 1,
      })
    ).rejects.toThrow(/accountProject or organizationProject/);
  });

  it('rejects when the projectId argument does not match the scope projectId segment', async () => {
    const svc = buildService([stubHandler('roleTemplates', [])]);
    await expect(
      svc.exportProjectCdm({
        projectId: 'different-project',
        scope,
        version: 1,
      })
    ).rejects.toThrow(/scope id must contain the same projectId/);
  });

  it('rejects unsupported version', async () => {
    const svc = buildService([stubHandler('roleTemplates', [])]);
    await expect(svc.exportProjectCdm({ projectId, scope, version: 2 })).rejects.toThrow(
      /Unsupported version/
    );
  });

  it('skips projectUserApiKeys handler when includeUserApiKeys is false but users section is included', async () => {
    const userAssignment = stubHandler('userAssignments', [
      { userId: 'u-1', roleTemplateKeys: ['r1'], directPermissionRefs: [], metadata: null },
    ]);
    const provisioned = stubHandler('provisionedUsers', []);
    const keys = stubHandler('projectUserApiKeys', [{ userId: 'u-1', clientId: 'c1' }]);

    const svc = buildService([userAssignment, provisioned, keys]);
    const out = await svc.exportProjectCdm({
      projectId,
      scope,
      version: 1,
      sections: ['users'],
      includeUserApiKeys: false,
    });

    expect(userAssignment.export).toHaveBeenCalledTimes(1);
    expect(provisioned.export).toHaveBeenCalledTimes(1);
    expect(keys.export).not.toHaveBeenCalled();
    expect(out.users).toEqual([
      expect.objectContaining({
        key: { value: 'u-1', findBy: CdmFindBy.Id },
        roles: ['r1'],
        apiKeys: [],
      }),
    ]);
  });

  it('when sections is set, only matching handlers run export', async () => {
    const roleTemplate = stubHandler('roleTemplates', [
      { externalKey: 'r1', name: 'R', description: null, permissionRefs: [], metadata: null },
    ]);
    const userAssignment = stubHandler('userAssignments', [
      { userId: 'u-1', roleTemplateKeys: [] },
    ]);
    const keys = stubHandler('projectUserApiKeys', [{ userId: 'u-1', clientId: 'c1' }]);

    const svc = buildService([roleTemplate, userAssignment, keys]);
    const out = await svc.exportProjectCdm({
      projectId,
      scope,
      version: 1,
      sections: ['roles'],
    });

    expect(out.roles).toEqual([expect.objectContaining({ key: 'r1' })]);
    expect(out.users).toEqual([]);
    expect(roleTemplate.export).toHaveBeenCalledTimes(1);
    expect(userAssignment.export).not.toHaveBeenCalled();
    expect(keys.export).not.toHaveBeenCalled();
  });

  it('empty sections array exports all handlers', async () => {
    const roleTemplate = stubHandler('roleTemplates', []);
    const userAssignment = stubHandler('userAssignments', []);
    const keys = stubHandler('projectUserApiKeys', []);
    const provisioned = stubHandler('provisionedUsers', []);
    const svc = buildService([roleTemplate, userAssignment, keys, provisioned]);
    await svc.exportProjectCdm({
      projectId,
      scope,
      version: 1,
      sections: [],
    });
    expect(roleTemplate.export).toHaveBeenCalled();
    expect(userAssignment.export).toHaveBeenCalled();
    expect(keys.export).toHaveBeenCalled();
  });

  it('maps tag + role + user handler output into canonical tags and roles.users tag keys', async () => {
    const tagOpaque = '60000000-0000-4000-8000-000000000aaa';
    const roleId = '70000000-0000-4000-8000-000000000777';
    const userId = '30000000-0000-4000-8000-000000000099';
    const grantGroupId = '80000000-0000-4000-8000-0000000000g1';
    const groupKey = 'cdm-group-linked-test';

    const tag = stubHandler('tags', [
      {
        key: tagOpaque,
        name: 'Alpha',
        color: '#fff',
        metadata: null,
      },
    ]);
    const roleTemplate = stubHandler('roleTemplates', [
      {
        externalKey: roleId,
        name: 'Existing role',
        description: null,
        permissionRefs: [{ resourceSlug: 'Tag', action: 'Query', permissionId: 'p-1' }],
        metadata: null,
        tagKeys: [tagOpaque],
        groupTagKeys: [tagOpaque],
        linkedGrantGroup: {
          grantGroupId,
          groupKey,
          groupName: 'Linked group',
          groupDescription: null,
          permissionKeys: [],
          tagKeys: [tagOpaque],
          primaryGroupTagKey: null,
        },
      },
    ]);
    const userAssignment = stubHandler('userAssignments', [
      {
        userId,
        roleTemplateKeys: [roleId],
        directPermissionRefs: [],
        metadata: null,
        tagKeys: [tagOpaque],
      },
    ]);
    const provisioned = stubHandler('provisionedUsers', []);
    const keys = stubHandler('projectUserApiKeys', []);

    const svc = buildService([tag, roleTemplate, userAssignment, provisioned, keys]);
    const out = await svc.exportProjectCdm({ projectId, scope, version: 1 });

    expect(out.tags).toEqual([expect.objectContaining({ key: tagOpaque, name: 'Alpha' })]);
    expect(out.groups).toEqual([
      expect.objectContaining({
        key: groupKey,
        name: 'Linked group',
        permissions: [],
        tags: [tagOpaque],
        primaryTag: null,
        metadata: { grantGroupId },
      }),
    ]);
    expect(out.roles).toEqual([
      expect.objectContaining({
        key: roleId,
        tags: [tagOpaque],
        groups: [groupKey],
        permissions: ['tag:query'],
      }),
    ]);
    expect(out.users).toEqual([
      expect.objectContaining({
        key: { value: userId, findBy: CdmFindBy.Id },
        tags: [tagOpaque],
      }),
    ]);
  });
});
