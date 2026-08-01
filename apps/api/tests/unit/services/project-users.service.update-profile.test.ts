import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectUserService } from '@/services/project-users.service';

describe('ProjectUserService.updateProjectUserProfile', () => {
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
    updateProjectUserProfile: vi.fn(),
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
        metadata: {},
        displayName: null,
        pictureUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);
    projectUserRepository.updateProjectUserProfile.mockResolvedValue({
      id: 'pu1',
      projectId: 'p1',
      userId: 'u1',
      metadata: {},
      displayName: 'Ali',
      pictureUrl: 'https://cdn.example/p.png',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  });

  it('updates pivot profile fields', async () => {
    const s = svc();
    await s.updateProjectUserProfile({
      projectId: 'p1',
      userId: 'u1',
      displayName: 'Ali',
      pictureUrl: 'https://cdn.example/p.png',
    });

    expect(projectUserRepository.updateProjectUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'p1',
        userId: 'u1',
        displayName: 'Ali',
        pictureUrl: 'https://cdn.example/p.png',
      }),
      undefined
    );
    expect(audit.logUpdate).toHaveBeenCalled();
  });
});
