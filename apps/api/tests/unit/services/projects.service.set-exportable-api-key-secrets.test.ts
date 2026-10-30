/**
 * Unit tests for ProjectService.setExportableApiKeySecrets: the per-project opt-in for
 * exportable API-key secrets. The write is one conditional repository call; the audit row is
 * written only for a real change; enabling fails closed without the encryption key.
 */
import type { IAuditLogger, IFileStorageService, IProjectRepository } from '@grantjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfigurationError, NotFoundError } from '@/lib/errors';
import type { Transaction } from '@/lib/transaction-manager.lib';
import { ProjectService } from '@/services/projects.service';

const projectId = '10000000-0000-4000-8000-000000000001';
const tx = { tx: true } as unknown as Transaction;
const ENCRYPTION_KEY_NAME = 'API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY';
// Never a real key: it must appear in no error, audit value or returned project.
const SENTINEL_KEY_MATERIAL = 'sentinel-exportable-secret-key-material-never-leaves';

function projectRow(overrides: Record<string, unknown> = {}) {
  return {
    id: projectId,
    name: 'Example project',
    slug: 'example-project',
    description: null,
    pictureUrl: null,
    primaryColor: null,
    showHelpPanel: null,
    exportableApiKeySecrets: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function buildService(
  options: {
    key?: string | undefined;
    setExportableApiKeySecrets?: ReturnType<typeof vi.fn>;
    getProjects?: ReturnType<typeof vi.fn>;
    copiesDeleted?: number;
  } = {}
) {
  const hasKey = 'key' in options ? options.key : SENTINEL_KEY_MATERIAL;
  const repository = {
    setExportableApiKeySecrets:
      options.setExportableApiKeySecrets ??
      vi.fn().mockResolvedValue(projectRow({ exportableApiKeySecrets: true })),
    getProjects:
      options.getProjects ??
      vi.fn().mockResolvedValue({ projects: [projectRow()], totalCount: 1, hasNextPage: false }),
  };
  const audit = {
    logAction: vi.fn().mockResolvedValue(undefined),
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  };
  const resolve = vi.fn().mockResolvedValue(hasKey);
  const exportableSecrets = {
    isEnabled: vi.fn(),
    storeForKey: vi.fn(),
    removeForKeys: vi.fn(),
    removeForProject: vi.fn().mockResolvedValue(options.copiesDeleted ?? 0),
    readForExport: vi.fn(),
  };
  const service = new ProjectService(
    repository as unknown as IProjectRepository,
    audit as unknown as IAuditLogger,
    {
      getUrl: vi.fn(),
    } as unknown as IFileStorageService,
    { resolve },
    exportableSecrets
  );
  return { service, repository, audit, resolve, exportableSecrets };
}

describe('ProjectService.setExportableApiKeySecrets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables the flag, writes one audit row with the old and new value, and returns the project', async () => {
    const { service, repository, audit } = buildService();

    const project = await service.setExportableApiKeySecrets({ projectId, enabled: true }, tx);

    expect(repository.setExportableApiKeySecrets).toHaveBeenCalledWith(
      { projectId, enabled: true },
      tx
    );
    expect(project.exportableApiKeySecrets).toBe(true);
    expect(audit.logAction).toHaveBeenCalledTimes(1);
    expect(audit.logAction).toHaveBeenCalledWith(
      {
        entityId: projectId,
        action: 'SET_EXPORTABLE_API_KEY_SECRETS',
        oldValues: { exportableApiKeySecrets: false },
        newValues: { exportableApiKeySecrets: true },
        metadata: expect.objectContaining({ copiesDeleted: 0 }),
      },
      tx
    );
  });

  it('disables the flag and audits the change true -> false, without needing the key', async () => {
    const { service, repository, audit, resolve } = buildService({
      key: undefined,
      setExportableApiKeySecrets: vi
        .fn()
        .mockResolvedValue(projectRow({ exportableApiKeySecrets: false })),
    });

    const project = await service.setExportableApiKeySecrets({ projectId, enabled: false }, tx);

    expect(resolve).not.toHaveBeenCalled();
    expect(repository.setExportableApiKeySecrets).toHaveBeenCalledWith(
      { projectId, enabled: false },
      tx
    );
    expect(project.exportableApiKeySecrets).toBe(false);
    expect(audit.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SET_EXPORTABLE_API_KEY_SECRETS',
        oldValues: { exportableApiKeySecrets: true },
        newValues: { exportableApiKeySecrets: false },
      }),
      tx
    );
  });

  it('opting out deletes every copy of the project in the same transaction and audits how many', async () => {
    const { service, audit, exportableSecrets } = buildService({
      copiesDeleted: 3,
      setExportableApiKeySecrets: vi
        .fn()
        .mockResolvedValue(projectRow({ exportableApiKeySecrets: false })),
    });

    await service.setExportableApiKeySecrets({ projectId, enabled: false }, tx);

    expect(exportableSecrets.removeForProject).toHaveBeenCalledWith(projectId, tx);
    expect(audit.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ copiesDeleted: 3 }) }),
      tx
    );
  });

  it('opting in deletes no copy and a same-value call neither deletes nor audits', async () => {
    const enabling = buildService();
    await enabling.service.setExportableApiKeySecrets({ projectId, enabled: true }, tx);
    expect(enabling.exportableSecrets.removeForProject).not.toHaveBeenCalled();

    const unchanged = buildService({
      setExportableApiKeySecrets: vi.fn().mockResolvedValue(null),
    });
    await unchanged.service.setExportableApiKeySecrets({ projectId, enabled: false }, tx);
    expect(unchanged.exportableSecrets.removeForProject).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'writes no audit row and returns the current project when the value is already %s',
    async (enabled) => {
      const { service, repository, audit } = buildService({
        setExportableApiKeySecrets: vi.fn().mockResolvedValue(null),
        getProjects: vi.fn().mockResolvedValue({
          projects: [projectRow({ exportableApiKeySecrets: enabled })],
          totalCount: 1,
          hasNextPage: false,
        }),
      });

      const project = await service.setExportableApiKeySecrets({ projectId, enabled }, tx);

      expect(repository.setExportableApiKeySecrets).toHaveBeenCalledTimes(1);
      expect(audit.logAction).not.toHaveBeenCalled();
      expect(project.exportableApiKeySecrets).toBe(enabled);
    }
  );

  it('refuses to enable without the encryption key: names the variable, writes and audits nothing', async () => {
    const { service, repository, audit, resolve } = buildService({ key: '' });

    const failure = await service
      .setExportableApiKeySecrets({ projectId, enabled: true }, tx)
      .catch((error: Error) => error);

    expect(failure).toBeInstanceOf(ConfigurationError);
    expect((failure as Error).message).toContain(ENCRYPTION_KEY_NAME);
    expect(resolve).toHaveBeenCalledWith(ENCRYPTION_KEY_NAME);
    expect(repository.setExportableApiKeySecrets).not.toHaveBeenCalled();
    expect(audit.logAction).not.toHaveBeenCalled();
  });

  it('resolves the key at the point of use and never carries the key material anywhere', async () => {
    const { service, audit, resolve } = buildService();

    const project = await service.setExportableApiKeySecrets({ projectId, enabled: true }, tx);

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(JSON.stringify({ project, audit: audit.logAction.mock.calls })).not.toContain(
      SENTINEL_KEY_MATERIAL
    );
  });

  it('answers NotFoundError for a project that does not exist (nothing changed, nothing audited)', async () => {
    const { service, audit } = buildService({
      setExportableApiKeySecrets: vi.fn().mockResolvedValue(null),
      getProjects: vi.fn().mockResolvedValue({ projects: [], totalCount: 0, hasNextPage: false }),
    });

    await expect(
      service.setExportableApiKeySecrets({ projectId, enabled: false }, tx)
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(audit.logAction).not.toHaveBeenCalled();
  });

  it('writes no audit row when the repository write fails', async () => {
    const { service, audit } = buildService({
      setExportableApiKeySecrets: vi.fn().mockRejectedValue(new Error('db down')),
    });

    await expect(
      service.setExportableApiKeySecrets({ projectId, enabled: true }, tx)
    ).rejects.toThrow('db down');
    expect(audit.logAction).not.toHaveBeenCalled();
  });

  it('rejects a project id that is not a uuid before any key lookup or write', async () => {
    const { service, repository, resolve } = buildService();

    await expect(
      service.setExportableApiKeySecrets({ projectId: 'not-a-uuid', enabled: true }, tx)
    ).rejects.toThrow();

    expect(resolve).not.toHaveBeenCalled();
    expect(repository.setExportableApiKeySecrets).not.toHaveBeenCalled();
  });
});
