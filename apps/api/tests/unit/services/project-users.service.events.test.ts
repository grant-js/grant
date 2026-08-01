import type {
  IAccountProjectRepository,
  IAuditLogger,
  IEventPublisher,
  IOrganizationProjectRepository,
  IProjectRepository,
  IProjectUserRepository,
  IUserRepository,
} from '@grantjs/core';
import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { ProjectUserService } from '@/services/project-users.service';

const projectId = '10000000-0000-4000-8000-000000000050';
const userId = '10000000-0000-4000-8000-000000000051';
const projectUserId = '10000000-0000-4000-8000-000000000052';
const organizationId = '10000000-0000-4000-8000-000000000053';

function buildService() {
  const projectRepository = {
    getProjects: vi.fn().mockResolvedValue({
      projects: [{ id: projectId }],
      totalCount: 1,
      hasNextPage: false,
    }),
  } as unknown as IProjectRepository;

  const userRepository = {
    getUsers: vi.fn().mockResolvedValue({
      users: [{ id: userId }],
      totalCount: 1,
      hasNextPage: false,
    }),
  } as unknown as IUserRepository;

  const projectUserRepository = {
    getProjectUsers: vi.fn().mockResolvedValue([]),
    addProjectUser: vi.fn().mockResolvedValue({
      id: projectUserId,
      projectId,
      userId,
      metadata: {},
      displayName: null,
      pictureUrl: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    }),
    updateProjectUserSearchDocument: vi.fn().mockResolvedValue(undefined),
  } as unknown as IProjectUserRepository;

  const organizationProjectRepository = {
    getFirstByProjectId: vi.fn().mockResolvedValue({ organizationId, projectId }),
  } as unknown as IOrganizationProjectRepository;

  const accountProjectRepository = {
    getFirstByProjectId: vi.fn().mockResolvedValue(null),
  } as unknown as IAccountProjectRepository;

  const audit = {
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  } as unknown as IAuditLogger;

  const events = {
    publish: vi.fn(),
  } as unknown as IEventPublisher;

  return {
    service: new ProjectUserService(
      projectRepository,
      userRepository,
      projectUserRepository,
      organizationProjectRepository,
      accountProjectRepository,
      audit,
      events
    ),
    events,
  };
}

describe('ProjectUserService membership events', () => {
  it('publishes project.user_added with explicit OrganizationProject scope', async () => {
    const { service, events } = buildService();

    await service.addProjectUser({ projectId, userId });

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'project.user_added',
        scope: {
          tenant: Tenant.OrganizationProject,
          id: `${organizationId}:${projectId}`,
        },
        subjectUserId: userId,
        aggregate: { kind: 'projectUser', id: projectUserId },
        data: {
          after: expect.objectContaining({
            id: projectUserId,
            projectId,
            userId,
          }),
        },
      }),
      undefined
    );
  });
});
