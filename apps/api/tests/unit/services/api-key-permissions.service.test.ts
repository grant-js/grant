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
