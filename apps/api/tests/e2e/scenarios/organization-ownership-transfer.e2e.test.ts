/**
 * Organization ownership transfer against the real E2E stack (GraphQL and REST).
 *
 * The owner hands the Owner role to another member and either keeps a lower role or leaves. Only
 * the current owner may do it; the new owner must be a current member with a verified email; and
 * when the organization enforces MFA for sensitive actions the transfer needs it like any other.
 *
 * Every test builds its own organization, so the file does not depend on test order.
 */
import { generateSync } from 'otplib';
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import {
  closeDbHelper,
  getOrganizationRoleIdByName,
  markEmailUnverifiedForE2e,
} from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

const ROLE_OWNER = 'roles.names.organizationOwner';
const ROLE_ADMIN = 'roles.names.organizationAdmin';
const ROLE_DEV = 'roles.names.organizationDev';
const ROLE_VIEWER = 'roles.names.organizationViewer';

const M_TRANSFER = /* GraphQL */ `
  mutation TransferOrganizationOwnership($input: TransferOrganizationOwnershipInput!) {
    transferOrganizationOwnership(input: $input) {
      organization {
        id
      }
      newOwner {
        id
        role {
          id
          name
        }
      }
      previousOwner {
        id
        role {
          id
          name
        }
      }
    }
  }
`;

const M_UPDATE_ORG = /* GraphQL */ `
  mutation UpdateOrganization($id: ID!, $input: UpdateOrganizationInput!) {
    updateOrganization(id: $id, input: $input) {
      id
      requireMfaForSensitiveActions
    }
  }
`;

const Q_MEMBERS = /* GraphQL */ `
  query OrganizationMembers($scope: Scope!) {
    organizationMembers(scope: $scope) {
      members {
        id
        type
        role {
          name
        }
      }
    }
  }
`;

interface TransferData {
  transferOrganizationOwnership: {
    organization: { id: string };
    newOwner: { id: string; role: { id: string; name: string } };
    previousOwner: { id: string; role: { id: string; name: string } } | null;
  };
}

interface Setup {
  owner: TestUser;
  member: TestUser;
  orgId: string;
  roleId: (name: string) => Promise<string>;
}

/** An organization with its owner and one accepted member holding `memberRole`. */
async function setup(memberRole: string = ROLE_DEV): Promise<Setup> {
  const owner = await TestUser.create({ withOrgAccount: true });
  const org = await owner.createOrganization(`Ownership Org ${Date.now()}`);
  const roleId = async (name: string) => {
    const id = await getOrganizationRoleIdByName(org.id, name);
    if (!id) throw new Error(`No ${name} role in organization ${org.id}`);
    return id;
  };

  const member = await TestUser.create({ withOrgAccount: true });
  await owner.inviteMember(org.id, member.email, await roleId(memberRole));
  await member.acceptInvitation(org.id);
  if (!member.userId) throw new Error('The invited member has no user id');

  return { owner, member, orgId: org.id, roleId };
}

const scopeOf = (orgId: string) => ({ tenant: 'organization', id: orgId });

function transferGraphql(user: TestUser, orgId: string, input: Record<string, unknown>) {
  return graphqlRequest<TransferData>({
    query: M_TRANSFER,
    variables: { input: { scope: scopeOf(orgId), ...input } },
    accessToken: user.accessToken,
  });
}

function transferRest(user: TestUser, orgId: string, body: Record<string, unknown>) {
  return apiClient()
    .post(`/api/organizations/${orgId}/ownership-transfer`)
    .set('Authorization', user.authHeader)
    .send({ scope: scopeOf(orgId), ...body });
}

async function memberRoles(user: TestUser, orgId: string): Promise<string[]> {
  const res = await graphqlRequest<{
    organizationMembers: { members: Array<{ type: string; role: { name: string } }> };
  }>({ query: Q_MEMBERS, variables: { scope: scopeOf(orgId) }, accessToken: user.accessToken });
  expect(res.body.errors).toBeUndefined();
  return res.body
    .data!.organizationMembers.members.filter((m) => m.type === 'member')
    .map((m) => m.role.name)
    .sort();
}

afterAll(async () => {
  await closeDbHelper();
});

describe('E2E: organization ownership transfer', () => {
  describe('GraphQL', () => {
    it('owner hands over to an Admin and keeps the role they choose', async () => {
      const { owner, member, orgId, roleId } = await setup(ROLE_ADMIN);

      const res = await transferGraphql(owner, orgId, {
        newOwnerId: member.userId,
        previousOwnerRoleId: await roleId(ROLE_VIEWER),
      });

      expect(res.body.errors).toBeUndefined();
      const result = res.body.data!.transferOrganizationOwnership;
      expect(result.organization.id).toBe(orgId);
      expect(result.newOwner.role.name).toBe(ROLE_OWNER);
      expect(result.previousOwner?.role.name).toBe(ROLE_VIEWER);
      // The organization still has exactly one owner.
      expect(await memberRoles(member, orgId)).toEqual([ROLE_OWNER, ROLE_VIEWER].sort());
    });

    it('owner can leave: the previous owner is gone and the new owner is the only member', async () => {
      const { owner, member, orgId } = await setup();

      const res = await transferGraphql(owner, orgId, {
        newOwnerId: member.userId,
        leaveOrganization: true,
      });

      expect(res.body.errors).toBeUndefined();
      const result = res.body.data!.transferOrganizationOwnership;
      expect(result.newOwner.role.name).toBe(ROLE_OWNER);
      expect(result.previousOwner).toBeNull();
      expect(await memberRoles(member, orgId)).toEqual([ROLE_OWNER]);
    });

    it('the previous owner can no longer transfer, and an Admin never could', async () => {
      const { owner, member, orgId, roleId } = await setup(ROLE_ADMIN);

      // The Admin tries to take the organization over.
      const refused = await transferGraphql(member, orgId, {
        newOwnerId: owner.userId,
        previousOwnerRoleId: await roleId(ROLE_VIEWER),
      });
      expect(refused.body.errors?.length).toBeGreaterThan(0);
      expect(refused.body.errors?.[0]?.extensions?.http).toEqual({ status: 403 });
      expect(await memberRoles(owner, orgId)).toEqual([ROLE_ADMIN, ROLE_OWNER].sort());

      await transferGraphql(owner, orgId, {
        newOwnerId: member.userId,
        previousOwnerRoleId: await roleId(ROLE_ADMIN),
      });
      const again = await transferGraphql(owner, orgId, {
        newOwnerId: member.userId,
        previousOwnerRoleId: await roleId(ROLE_ADMIN),
      });
      expect(again.body.errors?.[0]?.extensions?.http).toEqual({ status: 403 });
    });

    it.each([
      ['both a role and leaving', 'both'],
      ['neither a role nor leaving', 'neither'],
    ])('refuses %s with a stable reason', async (_label, mode) => {
      const { owner, member, orgId, roleId } = await setup();

      const res = await transferGraphql(owner, orgId, {
        newOwnerId: member.userId,
        ...(mode === 'both'
          ? { previousOwnerRoleId: await roleId(ROLE_ADMIN), leaveOrganization: true }
          : {}),
      });

      expect(res.body.errors?.[0]?.extensions?.reason).toBe('OWNERSHIP_TRANSFER_INVALID_SELECTION');
      expect(res.body.errors?.[0]?.extensions?.http).toEqual({ status: 400 });
    });

    it('refuses Owner as the role the previous owner keeps', async () => {
      const { owner, member, orgId, roleId } = await setup();

      const res = await transferGraphql(owner, orgId, {
        newOwnerId: member.userId,
        previousOwnerRoleId: await roleId(ROLE_OWNER),
      });

      expect(res.body.errors?.[0]?.extensions?.reason).toBe('OWNERSHIP_TRANSFER_INVALID_ROLE');
    });

    it('refuses the caller as the new owner', async () => {
      const { owner, orgId, roleId } = await setup();

      const res = await transferGraphql(owner, orgId, {
        newOwnerId: owner.userId,
        previousOwnerRoleId: await roleId(ROLE_ADMIN),
      });

      expect(res.body.errors?.[0]?.extensions?.reason).toBe('OWNERSHIP_TRANSFER_SELF');
    });

    it('refuses a user who is not a member (404) and leaves the organization untouched', async () => {
      const { owner, orgId, roleId } = await setup();
      const outsider = await TestUser.create({ withOrgAccount: true });

      const res = await transferGraphql(owner, orgId, {
        newOwnerId: outsider.userId,
        previousOwnerRoleId: await roleId(ROLE_ADMIN),
      });

      expect(res.body.errors?.[0]?.extensions?.reason).toBe('OWNERSHIP_TRANSFER_TARGET_NOT_MEMBER');
      expect(res.body.errors?.[0]?.extensions?.http).toEqual({ status: 404 });
      expect(await memberRoles(owner, orgId)).toEqual([ROLE_DEV, ROLE_OWNER].sort());
    });

    it('refuses a member whose email is not verified (409)', async () => {
      const { owner, member, orgId, roleId } = await setup();
      await markEmailUnverifiedForE2e(member.email);

      const res = await transferGraphql(owner, orgId, {
        newOwnerId: member.userId,
        previousOwnerRoleId: await roleId(ROLE_ADMIN),
      });

      expect(res.body.errors?.[0]?.extensions?.reason).toBe('OWNERSHIP_TRANSFER_TARGET_UNVERIFIED');
      expect(res.body.errors?.[0]?.extensions?.http).toEqual({ status: 409 });
      expect(await memberRoles(owner, orgId)).toEqual([ROLE_DEV, ROLE_OWNER].sort());
    });
  });

  describe('REST', () => {
    it('owner hands over and keeps Admin', async () => {
      const { owner, member, orgId, roleId } = await setup();

      const res = await transferRest(owner, orgId, {
        newOwnerId: member.userId,
        previousOwnerRoleId: await roleId(ROLE_ADMIN),
      }).expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.organization.id).toBe(orgId);
      expect(res.body.data.newOwner.role.name).toBe(ROLE_OWNER);
      expect(res.body.data.previousOwner.role.name).toBe(ROLE_ADMIN);
      expect(await memberRoles(member, orgId)).toEqual([ROLE_ADMIN, ROLE_OWNER].sort());
    });

    it('owner can leave', async () => {
      const { owner, member, orgId } = await setup();

      const res = await transferRest(owner, orgId, {
        newOwnerId: member.userId,
        leaveOrganization: true,
      }).expect(200);

      expect(res.body.data.previousOwner).toBeNull();
      expect(await memberRoles(member, orgId)).toEqual([ROLE_OWNER]);
    });

    it('an Admin is forbidden', async () => {
      const { owner, member, orgId, roleId } = await setup(ROLE_ADMIN);

      await transferRest(member, orgId, {
        newOwnerId: owner.userId,
        previousOwnerRoleId: await roleId(ROLE_VIEWER),
      }).expect(403);

      expect(await memberRoles(owner, orgId)).toEqual([ROLE_ADMIN, ROLE_OWNER].sort());
    });

    it('refuses an unverified member (409) and a non-member (404) with their reasons', async () => {
      const { owner, member, orgId, roleId } = await setup();
      const outsider = await TestUser.create({ withOrgAccount: true });
      await markEmailUnverifiedForE2e(member.email);

      const unverified = await transferRest(owner, orgId, {
        newOwnerId: member.userId,
        previousOwnerRoleId: await roleId(ROLE_ADMIN),
      }).expect(409);
      expect(unverified.body.extensions.reason).toBe('OWNERSHIP_TRANSFER_TARGET_UNVERIFIED');
      expect(unverified.body.translationKey).toBe('errors.ownershipTransfer.targetUnverified');

      const nonMember = await transferRest(owner, orgId, {
        newOwnerId: outsider.userId,
        previousOwnerRoleId: await roleId(ROLE_ADMIN),
      }).expect(404);
      expect(nonMember.body.extensions.reason).toBe('OWNERSHIP_TRANSFER_TARGET_NOT_MEMBER');
    });

    it('refuses a scope that is not the organization in the path', async () => {
      const { owner, member, orgId, roleId } = await setup();
      const other = await owner.createOrganization(`Other Org ${Date.now()}`);

      await apiClient()
        .post(`/api/organizations/${orgId}/ownership-transfer`)
        .set('Authorization', owner.authHeader)
        .send({
          scope: scopeOf(other.id),
          newOwnerId: member.userId,
          previousOwnerRoleId: await roleId(ROLE_ADMIN),
        })
        .expect(400);

      expect(await memberRoles(owner, orgId)).toEqual([ROLE_DEV, ROLE_OWNER].sort());
    });

    it('refuses an unauthenticated request', async () => {
      const { member, orgId } = await setup();

      await apiClient()
        .post(`/api/organizations/${orgId}/ownership-transfer`)
        .send({ scope: scopeOf(orgId), newOwnerId: member.userId, leaveOrganization: true })
        .expect(401);
    });
  });

  describe('MFA', () => {
    it('is required when the organization enforces it, on both transports', async () => {
      const { owner, member, orgId, roleId } = await setup();

      const enable = await graphqlRequest({
        query: M_UPDATE_ORG,
        variables: {
          id: orgId,
          input: { scope: scopeOf(orgId), requireMfaForSensitiveActions: true },
        },
        accessToken: owner.accessToken,
      });
      expect(enable.body.errors).toBeUndefined();

      const input = {
        newOwnerId: member.userId,
        previousOwnerRoleId: await roleId(ROLE_ADMIN),
      };

      const blockedGraphql = await transferGraphql(owner, orgId, input);
      expect(blockedGraphql.body.errors?.[0]?.extensions?.reason).toBe('MFA_REQUIRED');

      const blockedRest = await transferRest(owner, orgId, input).expect(403);
      expect(blockedRest.body.code).toBe('MFA_REQUIRED');
      expect(await memberRoles(owner, orgId)).toEqual([ROLE_DEV, ROLE_OWNER].sort());

      // Enroll TOTP and step up: the same request now goes through.
      const enrol = await apiClient()
        .post('/api/auth/mfa/setup')
        .set('Authorization', owner.authHeader)
        .expect(200);
      const verified = await apiClient()
        .post('/api/auth/mfa/verify')
        .set('Authorization', owner.authHeader)
        .send({ code: generateSync({ secret: enrol.body.data.secret as string, period: 30 }) })
        .expect(200);
      owner.accessToken = verified.body.data.accessToken;
      owner.refreshToken = verified.body.data.refreshToken;

      const res = await transferRest(owner, orgId, input).expect(200);
      expect(res.body.data.newOwner.role.name).toBe(ROLE_OWNER);
    });
  });
});
