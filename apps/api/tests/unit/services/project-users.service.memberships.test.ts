import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectUserService } from '@/services/project-users.service';

describe('ProjectUserService.getUserProjectMemberships', () => {
  const audit = {
    logUpdate: vi.fn(),
    logCreate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  };
  const projectRepository = {};
  const userRepository = {};
  const projectUserRepository = {
    getProjectUserMemberships: vi.fn(),
  };

  function svc() {
    return new ProjectUserService(
      projectRepository as never,
      userRepository as never,
      projectUserRepository as never,
      audit as never
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps enriched membership rows including null roles', async () => {
    projectUserRepository.getProjectUserMemberships.mockResolvedValue([
      {
        projectId: 'p1',
        projectName: 'Alpha',
        displayName: 'Ali',
        pictureUrl: null,
        metadata: { locale: 'en' },
        role: null,
        joinedAt: new Date('2024-01-01T00:00:00.000Z'),
        organizationId: 'org-1',
        organizationName: 'Acme',
        accountId: null,
      },
    ]);

    const result = await svc().getUserProjectMemberships('u1');

    expect(projectUserRepository.getProjectUserMemberships).toHaveBeenCalledWith('u1', undefined);
    expect(result).toEqual([
      expect.objectContaining({
        projectId: 'p1',
        projectName: 'Alpha',
        displayName: 'Ali',
        role: null,
        organizationName: 'Acme',
        metadata: { locale: 'en' },
      }),
    ]);
  });
});
