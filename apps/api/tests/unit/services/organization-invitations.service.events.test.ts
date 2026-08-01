import type {
  IAuditLogger,
  IEventPublisher,
  IOrganizationInvitationRepository,
  IOrganizationMemberRepository,
  IOrganizationUserRepository,
  IRoleRepository,
  IUserAuthenticationMethodRepository,
} from '@grantjs/core';
import { OrganizationInvitationStatus, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { OrganizationInvitationService } from '@/services/organization-invitations.service';

const invitationId = '10000000-0000-4000-8000-000000000030';
const organizationId = '10000000-0000-4000-8000-000000000031';
const roleId = '10000000-0000-4000-8000-000000000032';
const userId = '10000000-0000-4000-8000-000000000033';

function invitation(overrides: Record<string, unknown> = {}) {
  return {
    id: invitationId,
    organizationId,
    email: 'invitee@example.com',
    roleId,
    invitedBy: userId,
    status: OrganizationInvitationStatus.Pending,
    token: 'token',
    proofHash: null,
    invitedAt: new Date('2026-01-01T00:00:00.000Z'),
    acceptedAt: null,
    expiresAt: new Date('2026-02-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function buildService() {
  const organizationInvitationRepository = {
    getInvitationById: vi.fn().mockResolvedValue(invitation()),
    updateInvitation: vi.fn().mockResolvedValue(
      invitation({
        status: OrganizationInvitationStatus.Accepted,
        acceptedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      })
    ),
    softDeleteInvitation: vi.fn(),
    createInvitation: vi.fn(),
    getInvitationByToken: vi.fn(),
    getInvitationsByOrganization: vi.fn(),
  } as unknown as IOrganizationInvitationRepository;

  const userAuthenticationMethodRepository = {
    findByEmail: vi.fn().mockResolvedValue({ userId }),
  } as unknown as IUserAuthenticationMethodRepository;

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
    service: new OrganizationInvitationService(
      {} as IOrganizationMemberRepository,
      {} as IRoleRepository,
      organizationInvitationRepository,
      {} as IOrganizationUserRepository,
      null,
      audit,
      events,
      userAuthenticationMethodRepository
    ),
    events,
  };
}

describe('OrganizationInvitationService membership events', () => {
  it('publishes organization.invitation_accepted when status transitions to accepted', async () => {
    const { service, events } = buildService();

    await service.updateInvitation(invitationId, {
      status: OrganizationInvitationStatus.Accepted,
      acceptedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'organization.invitation_accepted',
        scope: { tenant: Tenant.Organization, id: organizationId },
        subjectUserId: userId,
        aggregate: { kind: 'organizationInvitation', id: invitationId },
        data: expect.objectContaining({
          before: expect.objectContaining({ status: OrganizationInvitationStatus.Pending }),
          after: expect.objectContaining({ status: OrganizationInvitationStatus.Accepted }),
        }),
      }),
      undefined
    );
  });
});
