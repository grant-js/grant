import type { DomainEvent } from '@grantjs/schema';
import { EVENT_CATALOG, EVENT_TYPES, Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AudienceResolver } from '@/lib/notifications/audience-resolver';

function event(overrides: Partial<DomainEvent> = {}): DomainEvent {
  return {
    id: 'evt-1',
    sequence: 1,
    type: 'role.created',
    category: 'iam',
    deliveryClass: 'notification',
    scope: { tenant: Tenant.OrganizationProject, id: 'org-1:proj-1' },
    actorUserId: 'actor-1',
    subjectUserId: null,
    data: {},
    occurredAt: new Date(),
    ...overrides,
  } as DomainEvent;
}

describe('AudienceResolver', () => {
  const projectUsers = {
    getProjectUsers: vi.fn(),
  };
  const organizationUsers = {
    getOrganizationUsers: vi.fn(),
    getUserIdsByOrganizationRoleNames: vi.fn(),
  };
  const organizationProjects = {
    getFirstByProjectId: vi.fn(),
  };
  const accountProjects = {
    getFirstByProjectId: vi.fn(),
  };
  const accounts = {
    getOwnerId: vi.fn(),
  };

  const resolver = new AudienceResolver(
    projectUsers as never,
    organizationUsers as never,
    organizationProjects as never,
    accountProjects as never,
    accounts as never
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves scopeMembers for organization scope', async () => {
    organizationUsers.getOrganizationUsers.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);

    const ids = await resolver.resolve(
      event({
        type: 'organization.mfa_enforcement_changed',
        scope: { tenant: Tenant.Organization, id: 'org-1' },
        actorUserId: null,
      })
    );

    expect(ids.sort()).toEqual(['u1', 'u2']);
  });

  it('resolves owners via org Owner/Admin roles for organization project scope', async () => {
    organizationProjects.getFirstByProjectId.mockResolvedValue({
      organizationId: 'org-1',
    });
    organizationUsers.getUserIdsByOrganizationRoleNames.mockResolvedValue(['owner-1', 'admin-1']);

    const ids = await resolver.resolve(
      event({
        type: 'api_key.created',
        scope: { tenant: Tenant.OrganizationProject, id: 'org-1:proj-1' },
        actorUserId: 'actor-1',
      })
    );

    expect(organizationUsers.getUserIdsByOrganizationRoleNames).toHaveBeenCalledWith(
      'org-1',
      ['Organization Owner', 'Organization Admin'],
      undefined
    );
    expect(ids.sort()).toEqual(['admin-1', 'owner-1']);
  });

  it('resolves roleHolders via Owner/Admin/Dev for organization project scope', async () => {
    organizationProjects.getFirstByProjectId.mockResolvedValue({
      organizationId: 'org-1',
    });
    organizationUsers.getUserIdsByOrganizationRoleNames.mockResolvedValue(['dev-1']);

    const ids = await resolver.resolve(
      event({
        type: 'role.created',
        scope: { tenant: Tenant.OrganizationProject, id: 'org-1:proj-1' },
        actorUserId: null,
      })
    );

    expect(organizationUsers.getUserIdsByOrganizationRoleNames).toHaveBeenCalledWith(
      'org-1',
      ['Organization Owner', 'Organization Admin', 'Organization Dev'],
      undefined
    );
    expect(ids).toEqual(['dev-1']);
  });

  it('resolves account project owners from account ownerId', async () => {
    accountProjects.getFirstByProjectId.mockResolvedValue({ accountId: 'acct-1' });
    accounts.getOwnerId.mockResolvedValue('account-owner-1');

    const ids = await resolver.resolve(
      event({
        type: 'api_key.created',
        scope: { tenant: Tenant.AccountProject, id: 'acct-1:proj-2' },
        actorUserId: null,
      })
    );

    expect(accounts.getOwnerId).toHaveBeenCalledWith('acct-1', undefined);
    expect(ids).toEqual(['account-owner-1']);
  });

  it('excludes actor when excludeActor is true', async () => {
    organizationProjects.getFirstByProjectId.mockResolvedValue({
      organizationId: 'org-1',
    });
    organizationUsers.getUserIdsByOrganizationRoleNames.mockResolvedValue(['actor-1', 'admin-1']);

    const ids = await resolver.resolve(
      event({
        type: 'api_key.created',
        scope: { tenant: Tenant.OrganizationProject, id: 'org-1:proj-1' },
        actorUserId: 'actor-1',
      })
    );

    expect(ids).toEqual(['admin-1']);
  });

  it('does not claim watchers in catalog audience rules', () => {
    for (const type of EVENT_TYPES) {
      expect(
        EVENT_CATALOG[type].audienceRule.primitives,
        `catalog entry "${type}" should not list watchers until a subscribe model exists`
      ).not.toContain('watchers');
    }
  });

  it('returns empty recipients when owners and roleHolders resolve empty', async () => {
    organizationProjects.getFirstByProjectId.mockResolvedValue({
      organizationId: 'org-1',
    });
    organizationUsers.getUserIdsByOrganizationRoleNames.mockResolvedValue([]);

    const ids = await resolver.resolve(
      event({
        type: 'permission.updated',
        scope: { tenant: Tenant.OrganizationProject, id: 'org-1:proj-1' },
        actorUserId: null,
      })
    );

    expect(ids).toEqual([]);
  });

  it('resolves subject for invitation events', async () => {
    const ids = await resolver.resolve(
      event({
        type: 'organization.invitation_sent',
        scope: { tenant: Tenant.Organization, id: 'org-1' },
        subjectUserId: 'invitee-1',
        actorUserId: 'actor-1',
      })
    );

    expect(ids).toEqual(['invitee-1']);
  });
});
