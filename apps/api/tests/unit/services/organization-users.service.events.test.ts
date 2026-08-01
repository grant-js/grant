import type {
  IAuditLogger,
  IEventPublisher,
  IOrganizationRepository,
  IOrganizationRoleRepository,
  IOrganizationUserRepository,
  IUserRepository,
} from '@grantjs/core';
import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { OrganizationUserService } from '@/services/organization-users.service';

const organizationId = '10000000-0000-4000-8000-000000000040';
const userId = '10000000-0000-4000-8000-000000000041';
const roleId = '10000000-0000-4000-8000-000000000042';
const organizationUserId = '10000000-0000-4000-8000-000000000043';

function buildService() {
  const organizationRepository = {
    getOrganizations: vi.fn().mockResolvedValue({
      organizations: [{ id: organizationId }],
      totalCount: 1,
      hasNextPage: false,
    }),
  } as unknown as IOrganizationRepository;

  const userRepository = {
    getUsers: vi.fn().mockResolvedValue({
      users: [{ id: userId }],
      totalCount: 1,
      hasNextPage: false,
    }),
  } as unknown as IUserRepository;

  const organizationRoleRepository = {
    getOrganizationRoles: vi.fn().mockResolvedValue([{ organizationId, roleId }]),
  } as unknown as IOrganizationRoleRepository;

  const organizationUserRepository = {
    getOrganizationUsers: vi.fn().mockResolvedValue([]),
    addOrganizationUser: vi.fn().mockResolvedValue({
      id: organizationUserId,
      organizationId,
      userId,
      roleId,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    }),
  } as unknown as IOrganizationUserRepository;

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
    service: new OrganizationUserService(
      organizationRepository,
      userRepository,
      organizationUserRepository,
      organizationRoleRepository,
      audit,
      events
    ),
    events,
  };
}

describe('OrganizationUserService membership events', () => {
  it('publishes organization.member_added after a successful add', async () => {
    const { service, events } = buildService();

    await service.addOrganizationUser({ organizationId, userId, roleId });

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'organization.member_added',
        scope: { tenant: Tenant.Organization, id: organizationId },
        subjectUserId: userId,
        aggregate: { kind: 'organizationUser', id: organizationUserId },
        data: {
          after: expect.objectContaining({
            id: organizationUserId,
            organizationId,
            userId,
            roleId,
          }),
        },
      }),
      undefined
    );
  });
});
