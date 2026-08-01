import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CDM_IMPORT_METADATA_KEY } from '@/constants/cdm-import.constants';
import { ProjectUserService } from '@/services/project-users.service';

describe('ProjectUserService.updateProjectUserMetadata', () => {
  const audit = {
    logUpdate: vi.fn(),
    logCreate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  };
  const projectRepository = {
    getProjects: vi.fn().mockResolvedValue({ projects: [{ id: 'p1' }] }),
  };
  const userRepository = {
    getUsers: vi.fn().mockResolvedValue({ users: [{ id: 'u1' }] }),
  };
  const projectUserRepository = {
    getProjectUsers: vi.fn(),
    updateProjectUserMetadata: vi.fn(),
    updateProjectUserSearchDocument: vi.fn().mockResolvedValue(undefined),
  };

  function svc() {
    return new ProjectUserService(
      projectRepository as never,
      userRepository as never,
      projectUserRepository as never,
      audit as never,
      { publish: vi.fn() } as never
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    projectUserRepository.getProjectUsers.mockResolvedValue([
      {
        id: 'pu1',
        projectId: 'p1',
        userId: 'u1',
        metadata: { [CDM_IMPORT_METADATA_KEY]: { projectId: 'p1', kind: 'group' }, keep: true },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);
    projectUserRepository.updateProjectUserMetadata.mockResolvedValue({
      id: 'pu1',
      projectId: 'p1',
      userId: 'u1',
      metadata: {
        [CDM_IMPORT_METADATA_KEY]: { projectId: 'p1', kind: 'group' },
        keep: true,
        extra: 'y',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  });

  it('merges incoming onto pivot and preserves cdmImport', async () => {
    const s = svc();
    await s.updateProjectUserMetadata({
      projectId: 'p1',
      userId: 'u1',
      metadata: { extra: 'y' },
    });

    expect(projectUserRepository.updateProjectUserMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          [CDM_IMPORT_METADATA_KEY]: { projectId: 'p1', kind: 'group' },
          extra: 'y',
        }),
      }),
      undefined
    );
    expect(audit.logUpdate).toHaveBeenCalled();
  });
});
