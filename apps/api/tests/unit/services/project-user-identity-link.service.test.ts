import type {
  IAuditLogger,
  ICredentialService,
  IEventPublisher,
  IProjectOAuthGrantService,
  IProjectUserIdentityLinkRepository,
  IUserAuthenticationMethodRepository,
  IUserMfaService,
  ProjectUserIdentityLinkFacts,
} from '@grantjs/core';
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BadRequestError, ConflictError, NotFoundError } from '@/lib/errors';
import { ProjectUserIdentityLinkService } from '@/services/project-user-identity-link.service';

const ORG = '00000000-0000-4000-8000-0000000000a1';
const PROJECT = '00000000-0000-4000-8000-0000000000b1';
const FROM = '00000000-0000-4000-8000-0000000000c1';
const TO = '00000000-0000-4000-8000-0000000000d1';
const ROW = '00000000-0000-4000-8000-0000000000e1';
const ADDRESS = 'sentinel-link-identity@example.test';

const okFacts: ProjectUserIdentityLinkFacts = {
  projectInOrganization: true,
  fromIsMember: true,
  toIsLive: true,
  toInOrganization: true,
  toIsMember: false,
};

const counts = {
  projectUsers: 1,
  projectUserGroups: 0,
  projectUserPermissions: 0,
  projectUserApiKeys: 0,
  projectUserCredentials: 1,
  userRoles: 1,
  userGroups: 0,
  userPermissions: 0,
  userTags: 0,
  duplicatesRetired: 0,
};

function setup() {
  const links = {
    readLinkFacts: vi.fn(async () => okFacts),
    moveProjectMembership: vi.fn(async () => ({ projectUserId: ROW, counts })),
    hasMembershipOutsideProject: vi.fn(async () => false),
    stripProjectImportMarker: vi.fn(async () => true),
    retireUser: vi.fn(async () => undefined),
  } satisfies IProjectUserIdentityLinkRepository;
  const methods = {
    findByProviderAndProviderId: vi.fn(async () => ({ id: 'm1', userId: TO })),
    getUserAuthenticationMethods: vi.fn(async () => []),
  };
  const credentials = { hasCredential: vi.fn(async () => false) };
  const userMfa = { hasActiveMfaEnrollment: vi.fn(async () => false) };
  const grants = { revokeAllForUserInProject: vi.fn(async () => 0) };
  const projectUserAudit = { logUpdate: vi.fn(async () => undefined) };
  const userAudit = { logSoftDelete: vi.fn(async () => undefined) };
  const events = { publish: vi.fn(async () => undefined) };

  const service = new ProjectUserIdentityLinkService(
    links,
    methods as unknown as IUserAuthenticationMethodRepository,
    credentials as unknown as ICredentialService,
    userMfa as unknown as IUserMfaService,
    grants as unknown as IProjectOAuthGrantService,
    projectUserAudit as unknown as IAuditLogger,
    userAudit as unknown as IAuditLogger,
    events as unknown as IEventPublisher
  );
  const run = (email = ADDRESS) =>
    service.linkIdentity({ organizationId: ORG, projectId: PROJECT, userId: FROM, email });

  const wroteNothing = () => {
    expect(links.moveProjectMembership).not.toHaveBeenCalled();
    expect(links.stripProjectImportMarker).not.toHaveBeenCalled();
    expect(links.retireUser).not.toHaveBeenCalled();
    expect(grants.revokeAllForUserInProject).not.toHaveBeenCalled();
    expect(projectUserAudit.logUpdate).not.toHaveBeenCalled();
    expect(userAudit.logSoftDelete).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  };

  return {
    links,
    methods,
    credentials,
    userMfa,
    grants,
    projectUserAudit,
    userAudit,
    events,
    run,
    wroteNothing,
  };
}

describe('ProjectUserIdentityLinkService.linkIdentity', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => {
    s = setup();
  });

  it('looks the address up normalized', async () => {
    await s.run(`  ${ADDRESS.toUpperCase()} `);
    expect(s.methods.findByProviderAndProviderId).toHaveBeenCalledWith(
      'email',
      ADDRESS,
      undefined,
      undefined
    );
  });

  it('moves, revokes, strips the marker, retires, audits and publishes one ids-only event', async () => {
    const result = await s.run();

    expect(result).toEqual({
      linked: true,
      projectUserId: ROW,
      fromUserId: FROM,
      toUserId: TO,
      fromRetired: true,
      counts,
    });
    expect(s.links.moveProjectMembership).toHaveBeenCalledWith(
      { projectId: PROJECT, fromUserId: FROM, toUserId: TO },
      undefined
    );
    expect(s.grants.revokeAllForUserInProject).toHaveBeenCalledWith(PROJECT, FROM, undefined);
    expect(s.links.stripProjectImportMarker).toHaveBeenCalledWith(
      { userId: FROM, projectId: PROJECT },
      undefined
    );
    expect(s.links.retireUser).toHaveBeenCalledWith({ userId: FROM }, undefined);
    expect(s.projectUserAudit.logUpdate).toHaveBeenCalledWith(
      ROW,
      { projectId: PROJECT, userId: FROM },
      { projectId: PROJECT, userId: TO },
      expect.objectContaining({ operation: 'link-identity', fromRetired: true }),
      undefined
    );

    expect(s.events.publish).toHaveBeenCalledTimes(1);
    const [event] = s.events.publish.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(event).toEqual({
      type: 'project.user_identity_linked',
      scope: { tenant: Tenant.OrganizationProject, id: `${ORG}:${PROJECT}` },
      subjectUserId: TO,
      aggregate: { kind: 'projectUser', id: ROW },
      data: { after: { projectId: PROJECT, fromUserId: FROM, toUserId: TO } },
    });
    expect(JSON.stringify(s.events.publish.mock.calls)).not.toContain(ADDRESS);
    expect(JSON.stringify(s.projectUserAudit.logUpdate.mock.calls)).not.toContain(ADDRESS);
  });

  it('keeps a member of another project live', async () => {
    s.links.hasMembershipOutsideProject.mockResolvedValueOnce(true);
    const result = await s.run();
    expect(result.fromRetired).toBe(false);
    expect(s.links.retireUser).not.toHaveBeenCalled();
    expect(s.userAudit.logSoftDelete).not.toHaveBeenCalled();
    expect(s.links.stripProjectImportMarker).toHaveBeenCalled();
  });

  it('is a no-op when the member already holds the address', async () => {
    s.methods.findByProviderAndProviderId.mockResolvedValueOnce({ id: 'm1', userId: FROM });
    const result = await s.run();
    expect(result).toMatchObject({ linked: false, toUserId: FROM, counts: null });
    s.wroteNothing();
  });

  it.each([
    ['the project is not in the organization', { projectInOrganization: false }, NotFoundError],
    ['the member is not a member', { fromIsMember: false }, NotFoundError],
    ['the holder is deleted', { toIsLive: false }, ConflictError],
    ['the holder is outside the organization', { toInOrganization: false }, ConflictError],
    ['the holder is already a member', { toIsMember: true }, ConflictError],
  ] as const)('refuses when %s, writing nothing', async (_label, facts, error) => {
    s.links.readLinkFacts.mockResolvedValueOnce({ ...okFacts, ...facts });
    await expect(s.run()).rejects.toBeInstanceOf(error);
    s.wroteNothing();
  });

  it('gives an outside holder the set-email conflict message', async () => {
    s.links.readLinkFacts.mockResolvedValueOnce({ ...okFacts, toInOrganization: false });
    await expect(s.run()).rejects.toThrow(
      'This authentication method is already connected to another account'
    );
  });

  it('refuses an address nobody holds, writing nothing', async () => {
    s.methods.findByProviderAndProviderId.mockResolvedValueOnce(null as never);
    await expect(s.run()).rejects.toBeInstanceOf(BadRequestError);
    s.wroteNothing();
  });

  it.each([
    [
      'an authentication method',
      (x: ReturnType<typeof setup>) =>
        x.methods.getUserAuthenticationMethods.mockResolvedValueOnce([{ id: 'own' }] as never),
    ],
    [
      'a platform password',
      (x: ReturnType<typeof setup>) => x.credentials.hasCredential.mockResolvedValueOnce(true),
    ],
    [
      'an MFA factor',
      (x: ReturnType<typeof setup>) => x.userMfa.hasActiveMfaEnrollment.mockResolvedValueOnce(true),
    ],
  ] as const)('refuses a member with %s, writing nothing', async (_label, arrange) => {
    arrange(s);
    await expect(s.run()).rejects.toBeInstanceOf(BadRequestError);
    s.wroteNothing();
  });

  it('reads the platform password outside the request transaction', async () => {
    await s.run();
    expect(s.credentials.hasCredential).toHaveBeenCalledWith({ scope: 'platform' }, FROM);
  });

  it('rejects a malformed address before any read', async () => {
    await expect(s.run('not-an-address')).rejects.toThrow();
    expect(s.methods.findByProviderAndProviderId).not.toHaveBeenCalled();
    s.wroteNothing();
  });
});
