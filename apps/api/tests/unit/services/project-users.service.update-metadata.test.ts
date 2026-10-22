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
    existsById: vi.fn().mockResolvedValue(true),
  };
  const userRepository = {
    getUsers: vi.fn().mockResolvedValue({ users: [{ id: 'u1' }] }),
  };
  const projectUserRepository = {
    getProjectUsers: vi.fn(),
    updateProjectUserMetadata: vi.fn(),
    updateProjectUserSearchDocument: vi.fn().mockResolvedValue(undefined),
  };

  const events = { publish: vi.fn() };

  // One instant for both mocks: separate `new Date()` calls can straddle a clock tick, and
  // the service would then report `createdAt`/`updatedAt` in the delta next to `metadata`.
  const now = new Date('2026-01-01T00:00:00.000Z');

  function svc() {
    return new ProjectUserService(
      projectRepository as never,
      userRepository as never,
      projectUserRepository as never,
      { getFirstByProjectId: vi.fn().mockResolvedValue(null) } as never,
      { getFirstByProjectId: vi.fn().mockResolvedValue(null) } as never,
      audit as never,
      events as never,
      { getUrl: vi.fn(async (path: string) => `/storage/${path}`) } as never,
      { removeCredential: vi.fn() } as never
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
        createdAt: now,
        updatedAt: now,
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
      createdAt: now,
      updatedAt: now,
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

  it('publishes project.user_updated with the user as subject and the metadata delta', async () => {
    await svc().updateProjectUserMetadata({
      projectId: 'p1',
      userId: 'u1',
      metadata: { extra: 'y' },
    });

    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'project.user_updated',
        subjectUserId: 'u1',
        aggregate: { kind: 'projectUser', id: 'pu1' },
        data: expect.objectContaining({
          before: expect.objectContaining({ id: 'pu1' }),
          after: expect.objectContaining({
            id: 'pu1',
            metadata: expect.objectContaining({ extra: 'y' }),
          }),
          delta: { metadata: expect.objectContaining({ from: expect.any(Object) }) },
        }),
      }),
      undefined
    );
  });

  it('publishes nothing when the project user does not exist', async () => {
    projectUserRepository.getProjectUsers.mockResolvedValue([]);

    await expect(
      svc().updateProjectUserMetadata({ projectId: 'p1', userId: 'u1', metadata: { extra: 'y' } })
    ).rejects.toThrow();
    expect(events.publish).not.toHaveBeenCalled();
  });
});
