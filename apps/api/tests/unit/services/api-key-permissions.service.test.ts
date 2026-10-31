import { describe, expect, it, vi } from 'vitest';

import { ApiKeyPermissionService } from '@/services/api-key-permissions.service';

const apiKeyId = '10000000-0000-4000-8000-000000000005';
const projectId = '20000000-0000-4000-8000-000000000042';
const refs = [
  { id: 'p1', resource: 'User', action: 'Query' },
  { id: 'p2', resource: 'ProjectSyncJob', action: 'Update' },
];

function build(added: string[]) {
  const apiKeyPermissionRepository = { addForKey: vi.fn().mockResolvedValue(added) };
  const permissionRepository = {
    getPermissionRefsByIds: vi.fn().mockResolvedValue(refs),
  };
  const audit = { logAction: vi.fn() };
  const service = new ApiKeyPermissionService(
    apiKeyPermissionRepository as never,
    permissionRepository as never,
    audit as never
  );
  return { service, apiKeyPermissionRepository, audit };
}

describe('ApiKeyPermissionService.attach', () => {
  it('writes the rows once and one ADD_PERMISSION audit row per added permission', async () => {
    const { service, apiKeyPermissionRepository, audit } = build(['p1', 'p2']);
    const tx = { __tx: true };

    await service.attach({ apiKeyId, projectId, permissionIds: ['p1', 'p2', 'p1'] }, tx as never);

    expect(apiKeyPermissionRepository.addForKey).toHaveBeenCalledWith(
      { apiKeyId, projectId, permissionIds: ['p1', 'p2'] },
      tx
    );
    expect(audit.logAction.mock.calls.map(([params]) => params)).toEqual([
      {
        entityId: apiKeyId,
        action: 'ADD_PERMISSION',
        newValues: { permissionId: 'p1', resource: 'User', action: 'Query' },
      },
      {
        entityId: apiKeyId,
        action: 'ADD_PERMISSION',
        newValues: { permissionId: 'p2', resource: 'ProjectSyncJob', action: 'Update' },
      },
    ]);
    expect(audit.logAction.mock.calls.every(([, passedTx]) => passedTx === tx)).toBe(true);
  });

  it('audits only what was added, not a permission the key already carried', async () => {
    const { service, audit } = build(['p2']);

    await service.attach({ apiKeyId, projectId, permissionIds: ['p1', 'p2'] });

    expect(audit.logAction).toHaveBeenCalledOnce();
    expect(audit.logAction.mock.calls[0][0].newValues).toMatchObject({ permissionId: 'p2' });
  });

  it('writes nothing for an empty list', async () => {
    const { service, apiKeyPermissionRepository, audit } = build([]);

    await service.attach({ apiKeyId, projectId, permissionIds: [] });

    expect(apiKeyPermissionRepository.addForKey).not.toHaveBeenCalled();
    expect(audit.logAction).not.toHaveBeenCalled();
  });
});

describe('ApiKeyPermissionService.replace', () => {
  const fromRoleId = '30000000-0000-4000-8000-000000000007';

  function buildReplace(result: { added: string[]; removed: string[] }) {
    const apiKeyPermissionRepository = {
      replaceForKey: vi.fn().mockResolvedValue(result),
      listForKey: vi.fn().mockResolvedValue([{ permissionId: 'p1' }]),
      listForKeys: vi.fn().mockResolvedValue([
        { apiKeyId, permissionId: 'p1' },
        { apiKeyId, permissionId: 'p2' },
        { apiKeyId: 'other', permissionId: 'p1' },
      ]),
    };
    const permissionRepository = {
      getPermissionRefsByIds: vi
        .fn()
        .mockImplementation(async (ids: string[]) => refs.filter((ref) => ids.includes(ref.id))),
    };
    const audit = { logAction: vi.fn() };
    const service = new ApiKeyPermissionService(
      apiKeyPermissionRepository as never,
      permissionRepository as never,
      audit as never
    );
    return { service, apiKeyPermissionRepository, permissionRepository, audit };
  }

  it('writes one audit row per added and per removed permission and one summary row of counts', async () => {
    const { service, apiKeyPermissionRepository, audit } = buildReplace({
      added: ['p2'],
      removed: ['p1'],
    });
    const tx = { __tx: true };

    const result = await service.replace(
      { apiKeyId, projectId, permissionIds: ['p2', 'p2'] },
      tx as never
    );

    expect(result).toEqual({ added: ['p2'], removed: ['p1'] });
    expect(apiKeyPermissionRepository.replaceForKey).toHaveBeenCalledWith(
      { apiKeyId, projectId, permissionIds: ['p2'] },
      tx
    );
    expect(audit.logAction.mock.calls.map(([params]) => params)).toEqual([
      {
        entityId: apiKeyId,
        action: 'ADD_PERMISSION',
        newValues: { permissionId: 'p2', resource: 'ProjectSyncJob', action: 'Update' },
        metadata: undefined,
      },
      {
        entityId: apiKeyId,
        action: 'REMOVE_PERMISSION',
        oldValues: { permissionId: 'p1', resource: 'User', action: 'Query' },
        metadata: undefined,
      },
      {
        entityId: apiKeyId,
        action: 'UPDATE_API_KEY_PERMISSIONS',
        newValues: { added: 1, removed: 1 },
      },
    ]);
    expect(audit.logAction.mock.calls.every(([, passedTx]) => passedTx === tx)).toBe(true);
  });

  it('names the role a conversion came from on its rows and on the summary', async () => {
    const { service, audit } = buildReplace({ added: ['p1', 'p2'], removed: [] });

    await service.replace({ apiKeyId, projectId, permissionIds: ['p1', 'p2'], fromRoleId });

    const rows = audit.logAction.mock.calls.map(([params]) => params);
    expect(rows.filter((row) => row.action === 'ADD_PERMISSION')).toHaveLength(2);
    expect(
      rows
        .filter((row) => row.action === 'ADD_PERMISSION')
        .every((row) => row.metadata?.fromRoleId === fromRoleId)
    ).toBe(true);
    expect(rows[rows.length - 1]).toEqual({
      entityId: apiKeyId,
      action: 'UPDATE_API_KEY_PERMISSIONS',
      newValues: { added: 2, removed: 0, convertedFromRoleId: fromRoleId },
    });
  });

  it('writes no audit row when nothing changed', async () => {
    const { service, audit, permissionRepository } = buildReplace({ added: [], removed: [] });

    await expect(service.replace({ apiKeyId, projectId, permissionIds: ['p1'] })).resolves.toEqual({
      added: [],
      removed: [],
    });

    expect(audit.logAction).not.toHaveBeenCalled();
    expect(permissionRepository.getPermissionRefsByIds).not.toHaveBeenCalled();
  });

  it('still records a removed permission whose row can no longer be resolved', async () => {
    const { service, audit } = buildReplace({ added: [], removed: ['gone'] });

    await service.replace({ apiKeyId, projectId, permissionIds: ['p1'] });

    expect(audit.logAction.mock.calls[0][0]).toMatchObject({
      action: 'REMOVE_PERMISSION',
      oldValues: { permissionId: 'gone', resource: null, action: null },
    });
  });

  it('puts only counts and ids in the audit rows', async () => {
    const { service, audit } = buildReplace({ added: ['p2'], removed: ['p1'] });

    await service.replace({ apiKeyId, projectId, permissionIds: ['p2'], fromRoleId });

    const summary = audit.logAction.mock.calls
      .map(([params]) => params)
      .find((row) => row.action === 'UPDATE_API_KEY_PERMISSIONS');
    expect(Object.keys(summary!.newValues!).sort()).toEqual([
      'added',
      'convertedFromRoleId',
      'removed',
    ]);
  });
});

describe('ApiKeyPermissionService reads', () => {
  it('lists the permission ids of one key', async () => {
    const apiKeyPermissionRepository = {
      listForKey: vi.fn().mockResolvedValue([{ permissionId: 'p1' }, { permissionId: 'p2' }]),
    };
    const service = new ApiKeyPermissionService(
      apiKeyPermissionRepository as never,
      {} as never,
      {} as never
    );

    await expect(service.listForKey(apiKeyId)).resolves.toEqual(['p1', 'p2']);
  });

  it('groups the permission ids by key', async () => {
    const apiKeyPermissionRepository = {
      listForKeys: vi.fn().mockResolvedValue([
        { apiKeyId, permissionId: 'p1' },
        { apiKeyId, permissionId: 'p2' },
        { apiKeyId: 'other', permissionId: 'p1' },
      ]),
    };
    const service = new ApiKeyPermissionService(
      apiKeyPermissionRepository as never,
      {} as never,
      {} as never
    );

    const grouped = await service.listForKeys([apiKeyId, 'other']);

    expect(grouped.get(apiKeyId)).toEqual(['p1', 'p2']);
    expect(grouped.get('other')).toEqual(['p1']);
    expect(grouped.get('absent')).toBeUndefined();
  });
});
