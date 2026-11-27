/**
 * Unit tests for OrganizationMemberService.transferOwnership: who may transfer, who may receive,
 * the role the previous owner keeps (or leaving), the write order, and the audit entry and the
 * one event that come with it. Repositories are stand-ins; what is asserted is the rules.
 */
import { ORGANIZATION_ROLE_DEFINITIONS, RoleKey } from '@grantjs/constants';
import { Tenant, TokenType } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AuthorizationError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors';
import {
  OrganizationMemberService,
  OWNERSHIP_TRANSFER_REASON,
} from '@/services/organization-members.service';

const organizationId = '10000000-0000-4000-8000-0000000000a1';
const callerId = '10000000-0000-4000-8000-0000000000a2';
const targetId = '10000000-0000-4000-8000-0000000000a3';
const tx = { tx: true };

const roleName = (key: RoleKey) => ORGANIZATION_ROLE_DEFINITIONS[key].name;
const ROLE = {
  owner: { id: 'role-owner', name: roleName(RoleKey.OrganizationOwner) },
  admin: { id: 'role-admin', name: roleName(RoleKey.OrganizationAdmin) },
  dev: { id: 'role-dev', name: roleName(RoleKey.OrganizationDev) },
  viewer: { id: 'role-viewer', name: roleName(RoleKey.OrganizationViewer) },
  custom: { id: 'role-custom', name: 'a custom role' },
};
const OTHER_ORG_ROLE_ID = 'role-of-another-organization';

interface Options {
  user?: { userId: string; type: TokenType } | null;
  lockedMembers?: Array<{ userId: string; roleId: string; userDeletedAt: Date | null }>;
  authMethods?: Array<{ isVerified: boolean }>;
  updateOrganizationUser?: ReturnType<typeof vi.fn>;
  organization?: Record<string, unknown>;
}

function build(options: Options = {}) {
  const lockedMembers = options.lockedMembers ?? [
    { userId: callerId, roleId: ROLE.owner.id, userDeletedAt: null },
    { userId: targetId, roleId: ROLE.dev.id, userDeletedAt: null },
  ];
  const calls: string[] = [];

  const organizationUserRepository = {
    lockMembersForUpdate: vi.fn(async () => {
      calls.push('lock');
      return lockedMembers;
    }),
    updateOrganizationUser:
      options.updateOrganizationUser ??
      vi.fn(async (params: { userId: string }) => {
        calls.push(`update:${params.userId}`);
        return params;
      }),
    softDeleteOrganizationUser: vi.fn(async (params: { userId: string }) => {
      calls.push(`softDelete:${params.userId}`);
      return params;
    }),
  };
  const organizationRoleRepository = {
    getOrganizationRoles: vi.fn(async () =>
      [ROLE.owner, ROLE.admin, ROLE.dev, ROLE.viewer, ROLE.custom].map((role) => ({
        roleId: role.id,
      }))
    ),
  };
  const roleRepository = {
    getRoles: vi.fn(async () => ({
      roles: [ROLE.owner, ROLE.admin, ROLE.dev, ROLE.viewer, ROLE.custom],
    })),
  };
  const organizationMemberRepository = {
    getOrganizationMember: vi.fn(async ({ userId }: { userId: string }) => ({
      id: userId,
      name: `member ${userId}`,
      role: { id: userId === targetId ? ROLE.owner.id : ROLE.admin.id },
    })),
  };
  const organizationRepository = {
    getOrganizations: vi.fn(async () => ({
      organizations: [
        options.organization ?? {
          id: organizationId,
          name: 'Acme',
          slug: 'acme',
          picturePath: null,
        },
      ],
    })),
  };
  const userAuthenticationMethodRepository = {
    getUserAuthenticationMethods: vi.fn(async () => options.authMethods ?? [{ isVerified: true }]),
  };
  const audit = { logUpdate: vi.fn(async () => undefined) };
  const events = { publish: vi.fn(async () => undefined) };
  const fileStorage = { getUrl: vi.fn(async (path: string) => `/storage/${path}`) };

  const service = new OrganizationMemberService(
    organizationMemberRepository as never,
    organizationUserRepository as never,
    organizationRoleRepository as never,
    roleRepository as never,
    (options.user === undefined
      ? { userId: callerId, type: TokenType.Session }
      : options.user) as never,
    audit as never,
    events as never,
    { getOrganizationProjects: vi.fn() } as never,
    organizationRepository as never,
    userAuthenticationMethodRepository as never,
    fileStorage as never
  );
  return {
    service,
    calls,
    organizationUserRepository,
    organizationMemberRepository,
    userAuthenticationMethodRepository,
    audit,
    events,
  };
}

const scope = { tenant: Tenant.Organization, id: organizationId };
const transfer = (
  service: OrganizationMemberService,
  input: {
    newOwnerId?: string;
    previousOwnerRoleId?: string | null;
    leaveOrganization?: boolean | null;
  } = {}
) =>
  service.transferOwnership(
    {
      scope,
      newOwnerId: targetId,
      previousOwnerRoleId: ROLE.admin.id,
      ...input,
    } as never,
    tx as never
  );

async function expectRefusal(
  promise: Promise<unknown>,
  type: new (...args: never[]) => Error,
  reason: string
) {
  const error = await promise.then(
    () => undefined,
    (thrown: unknown) => thrown
  );
  expect(error, 'expected the transfer to be refused').toBeInstanceOf(type);
  expect((error as { reason?: string }).reason).toBe(reason);
}

describe('OrganizationMemberService.transferOwnership', () => {
  let ctx: ReturnType<typeof build>;

  beforeEach(() => {
    ctx = build();
  });

  describe('a transfer that is allowed', () => {
    it('makes the target the owner and keeps the previous owner as the chosen role', async () => {
      const result = await transfer(ctx.service);

      expect(ctx.organizationUserRepository.updateOrganizationUser).toHaveBeenCalledTimes(2);
      expect(ctx.organizationUserRepository.updateOrganizationUser).toHaveBeenNthCalledWith(
        1,
        { organizationId, userId: targetId, roleId: ROLE.owner.id },
        tx
      );
      expect(ctx.organizationUserRepository.updateOrganizationUser).toHaveBeenNthCalledWith(
        2,
        { organizationId, userId: callerId, roleId: ROLE.admin.id },
        tx
      );
      expect(ctx.organizationUserRepository.softDeleteOrganizationUser).not.toHaveBeenCalled();
      expect(result.organization).toMatchObject({ id: organizationId, name: 'Acme' });
      expect(result.newOwner).toMatchObject({ id: targetId });
      expect(result.previousOwner).toMatchObject({ id: callerId });
    });

    it.each([ROLE.admin, ROLE.dev, ROLE.viewer])(
      'lets the previous owner keep $name',
      async (role) => {
        await transfer(ctx.service, { previousOwnerRoleId: role.id });

        expect(ctx.organizationUserRepository.updateOrganizationUser).toHaveBeenLastCalledWith(
          { organizationId, userId: callerId, roleId: role.id },
          tx
        );
      }
    );

    it('removes the previous owner membership when they choose to leave', async () => {
      const result = await transfer(ctx.service, {
        previousOwnerRoleId: undefined,
        leaveOrganization: true,
      });

      expect(ctx.organizationUserRepository.updateOrganizationUser).toHaveBeenCalledTimes(1);
      expect(ctx.organizationUserRepository.softDeleteOrganizationUser).toHaveBeenCalledWith(
        { organizationId, userId: callerId },
        tx
      );
      expect(result.previousOwner).toBeNull();
      expect(ctx.organizationMemberRepository.getOrganizationMember).toHaveBeenCalledTimes(1);
    });

    it('locks both memberships before it decides, and gives Owner before it takes it away', async () => {
      await transfer(ctx.service);

      expect(ctx.organizationUserRepository.lockMembersForUpdate).toHaveBeenCalledWith(
        { organizationId, userIds: [callerId, targetId] },
        tx
      );
      expect(ctx.calls).toEqual(['lock', `update:${targetId}`, `update:${callerId}`]);
    });

    it('resolves the picture url of the returned organization', async () => {
      const withPicture = build({
        organization: { id: organizationId, name: 'Acme', picturePath: 'orgs/a.png' },
      });

      const { organization } = await transfer(withPicture.service);

      expect(organization.pictureUrl).toBe('/storage/orgs/a.png');
    });
  });

  describe('who may transfer', () => {
    it('refuses a caller who is not the owner (an Admin)', async () => {
      const admin = build({
        lockedMembers: [
          { userId: callerId, roleId: ROLE.admin.id, userDeletedAt: null },
          { userId: targetId, roleId: ROLE.dev.id, userDeletedAt: null },
        ],
      });

      await expectRefusal(
        transfer(admin.service),
        AuthorizationError,
        OWNERSHIP_TRANSFER_REASON.NotOwner
      );
      expect(admin.organizationUserRepository.updateOrganizationUser).not.toHaveBeenCalled();
      expect(admin.events.publish).not.toHaveBeenCalled();
    });

    it('refuses a caller who is not a member of the organization at all', async () => {
      const outsider = build({
        lockedMembers: [{ userId: targetId, roleId: ROLE.dev.id, userDeletedAt: null }],
      });

      await expectRefusal(
        transfer(outsider.service),
        AuthorizationError,
        OWNERSHIP_TRANSFER_REASON.NotOwner
      );
    });

    it.each([TokenType.ApiKey, TokenType.ProjectApp, TokenType.System])(
      'refuses a %s caller before reading anything',
      async (type) => {
        const keyed = build({ user: { userId: callerId, type } });

        await expectRefusal(
          transfer(keyed.service),
          AuthorizationError,
          OWNERSHIP_TRANSFER_REASON.SessionRequired
        );
        expect(keyed.organizationUserRepository.lockMembersForUpdate).not.toHaveBeenCalled();
      }
    );

    it('refuses a request with no authenticated user', async () => {
      const anonymous = build({ user: null });

      await expect(transfer(anonymous.service)).rejects.toBeInstanceOf(AuthorizationError);
      expect(anonymous.organizationUserRepository.lockMembersForUpdate).not.toHaveBeenCalled();
    });

    it('refuses a scope that is not an organization', async () => {
      await expect(
        ctx.service.transferOwnership(
          {
            scope: { tenant: Tenant.Account, id: organizationId },
            newOwnerId: targetId,
            previousOwnerRoleId: ROLE.admin.id,
          } as never,
          tx as never
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });
  });

  describe('what the previous owner becomes', () => {
    it.each([
      ['both a role and leaving', { previousOwnerRoleId: ROLE.admin.id, leaveOrganization: true }],
      ['neither a role nor leaving', { previousOwnerRoleId: undefined }],
      ['neither (leave false, no role)', { previousOwnerRoleId: null, leaveOrganization: false }],
    ])('refuses %s', async (_label, input) => {
      await expectRefusal(
        transfer(ctx.service, input),
        BadRequestError,
        OWNERSHIP_TRANSFER_REASON.InvalidSelection
      );
      expect(ctx.organizationUserRepository.lockMembersForUpdate).not.toHaveBeenCalled();
    });

    it('refuses Owner as the previous owner role', async () => {
      await expectRefusal(
        transfer(ctx.service, { previousOwnerRoleId: ROLE.owner.id }),
        BadRequestError,
        OWNERSHIP_TRANSFER_REASON.InvalidRole
      );
      expect(ctx.organizationUserRepository.updateOrganizationUser).not.toHaveBeenCalled();
    });

    it.each([
      ['a role of another organization', OTHER_ORG_ROLE_ID],
      ['a role with no standard level', ROLE.custom.id],
    ])('refuses %s', async (_label, roleId) => {
      await expectRefusal(
        transfer(ctx.service, { previousOwnerRoleId: roleId }),
        BadRequestError,
        OWNERSHIP_TRANSFER_REASON.InvalidRole
      );
      expect(ctx.organizationUserRepository.updateOrganizationUser).not.toHaveBeenCalled();
    });
  });

  describe('who may receive', () => {
    it('refuses the caller as the new owner', async () => {
      await expectRefusal(
        transfer(ctx.service, { newOwnerId: callerId }),
        BadRequestError,
        OWNERSHIP_TRANSFER_REASON.Self
      );
      expect(ctx.organizationUserRepository.lockMembersForUpdate).not.toHaveBeenCalled();
    });

    it('answers not-found for a user who is not a member (a pending invitation is no membership)', async () => {
      const nonMember = build({
        lockedMembers: [{ userId: callerId, roleId: ROLE.owner.id, userDeletedAt: null }],
      });

      await expectRefusal(
        transfer(nonMember.service),
        NotFoundError,
        OWNERSHIP_TRANSFER_REASON.TargetNotMember
      );
      expect(nonMember.organizationUserRepository.updateOrganizationUser).not.toHaveBeenCalled();
    });

    it('answers conflict for a deactivated user', async () => {
      const deactivated = build({
        lockedMembers: [
          { userId: callerId, roleId: ROLE.owner.id, userDeletedAt: null },
          { userId: targetId, roleId: ROLE.dev.id, userDeletedAt: new Date() },
        ],
      });

      await expectRefusal(
        transfer(deactivated.service),
        ConflictError,
        OWNERSHIP_TRANSFER_REASON.TargetDeactivated
      );
      expect(deactivated.organizationUserRepository.updateOrganizationUser).not.toHaveBeenCalled();
    });

    it.each([
      ['has no authentication method', []],
      ['has only unverified methods', [{ isVerified: false }, { isVerified: false }]],
    ])('answers conflict for a user who %s', async (_label, authMethods) => {
      const unverified = build({ authMethods });

      await expectRefusal(
        transfer(unverified.service),
        ConflictError,
        OWNERSHIP_TRANSFER_REASON.TargetUnverified
      );
      expect(
        unverified.userAuthenticationMethodRepository.getUserAuthenticationMethods
      ).toHaveBeenCalledWith({ userId: targetId }, tx);
      expect(unverified.organizationUserRepository.updateOrganizationUser).not.toHaveBeenCalled();
    });

    it('accepts a user with one verified method among unverified ones', async () => {
      const mixed = build({ authMethods: [{ isVerified: false }, { isVerified: true }] });

      await expect(transfer(mixed.service)).resolves.toBeDefined();
    });
  });

  describe('the order of the writes', () => {
    it('does not touch the previous owner when giving the target Owner fails', async () => {
      const failure = new Error('write failed');
      const failing = build({
        updateOrganizationUser: vi.fn().mockRejectedValueOnce(failure),
      });

      await expect(transfer(failing.service)).rejects.toBe(failure);

      expect(failing.organizationUserRepository.updateOrganizationUser).toHaveBeenCalledTimes(1);
      expect(failing.organizationUserRepository.updateOrganizationUser).toHaveBeenCalledWith(
        { organizationId, userId: targetId, roleId: ROLE.owner.id },
        tx
      );
      expect(failing.organizationUserRepository.softDeleteOrganizationUser).not.toHaveBeenCalled();
      expect(failing.audit.logUpdate).not.toHaveBeenCalled();
      expect(failing.events.publish).not.toHaveBeenCalled();
    });

    it('does not remove the previous owner when giving the target Owner fails and they chose to leave', async () => {
      const failing = build({
        updateOrganizationUser: vi.fn().mockRejectedValueOnce(new Error('write failed')),
      });

      await expect(
        transfer(failing.service, { previousOwnerRoleId: undefined, leaveOrganization: true })
      ).rejects.toThrow('write failed');

      expect(failing.organizationUserRepository.softDeleteOrganizationUser).not.toHaveBeenCalled();
    });
  });

  describe('audit and event', () => {
    it('writes one audit entry and publishes one event, with ids only, in the same transaction', async () => {
      await transfer(ctx.service);

      const before = {
        previousOwnerUserId: callerId,
        previousOwnerRoleId: ROLE.owner.id,
        newOwnerUserId: targetId,
        newOwnerRoleId: ROLE.dev.id,
      };
      const after = {
        previousOwnerUserId: callerId,
        previousOwnerRoleId: ROLE.admin.id,
        newOwnerUserId: targetId,
        newOwnerRoleId: ROLE.owner.id,
      };

      expect(ctx.audit.logUpdate).toHaveBeenCalledTimes(1);
      expect(ctx.audit.logUpdate).toHaveBeenCalledWith(
        organizationId,
        before,
        after,
        { context: 'OrganizationMemberService.transferOwnership' },
        tx
      );
      expect(ctx.events.publish).toHaveBeenCalledTimes(1);
      expect(ctx.events.publish).toHaveBeenCalledWith(
        {
          type: 'organization.ownership_transferred',
          scope,
          subjectUserId: targetId,
          aggregate: { kind: 'organization', id: organizationId },
          data: {
            before,
            after,
            delta: {
              previousOwnerRoleId: { from: ROLE.owner.id, to: ROLE.admin.id },
              newOwnerRoleId: { from: ROLE.dev.id, to: ROLE.owner.id },
            },
          },
        },
        tx
      );
    });

    it('records a null previous-owner role when they left', async () => {
      await transfer(ctx.service, { previousOwnerRoleId: undefined, leaveOrganization: true });

      const published = (ctx.events.publish.mock.calls as unknown as unknown[][])[0]?.[0] as {
        data: { after: Record<string, unknown> };
      };
      expect(published.data.after.previousOwnerRoleId).toBeNull();
    });

    it('carries no names or emails in the audit entry or the event', async () => {
      await transfer(ctx.service);

      const serialized = JSON.stringify([
        ctx.audit.logUpdate.mock.calls,
        ctx.events.publish.mock.calls,
      ]);
      expect(serialized).not.toContain('member ');
      expect(serialized).not.toContain('Acme');
      expect(serialized).not.toMatch(/@/);
    });

    it.each([
      ['not the owner', build({ user: { userId: callerId, type: TokenType.ApiKey } })],
      ['the target is unverified', build({ authMethods: [{ isVerified: false }] })],
    ])('writes neither when the transfer is refused (%s)', async (_label, refused) => {
      await expect(transfer(refused.service)).rejects.toBeDefined();

      expect(refused.audit.logUpdate).not.toHaveBeenCalled();
      expect(refused.events.publish).not.toHaveBeenCalled();
    });
  });

  it('rejects a malformed input before anything else', async () => {
    await expect(
      ctx.service.transferOwnership({ scope } as never, tx as never)
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
