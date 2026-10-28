/**
 * E2E: organizationMembers union sort (regression for ambiguous ORDER BY "name").
 *
 * Lists an org that has at least one member and one pending invitation for every
 * sortable field and both orders. The production failure was HTTP 500
 * INTERNAL_ERROR from Postgres 42702.
 */
import {
  GetOrganizationMembersDocument,
  MemberType,
  OrganizationMemberSortableField,
  SortOrder,
  Tenant,
} from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { closeDbHelper, getOrganizationRoleIdByName } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

const ROLE_VIEWER = 'roles.names.organizationViewer';

const SORT_FIELDS = [
  OrganizationMemberSortableField.Name,
  OrganizationMemberSortableField.Email,
  OrganizationMemberSortableField.Role,
  OrganizationMemberSortableField.CreatedAt,
] as const;

const SORT_ORDERS = [SortOrder.Asc, SortOrder.Desc] as const;

interface OrganizationMembersData {
  organizationMembers?: {
    members: Array<{
      id: string;
      name: string;
      email?: string | null;
      type: MemberType;
      role: { name: string };
      status?: string | null;
      createdAt: string;
    }>;
    totalCount: number;
  };
}

afterAll(async () => {
  await closeDbHelper();
});

describe('organizationMembers sort (member ∪ pending invitation)', () => {
  let owner: TestUser;
  let org: { id: string; name: string; slug: string };
  let invitationEmail: string;

  it('setup: one member and one pending invitation with distinct sort keys', async () => {
    const stamp = Date.now();
    owner = await TestUser.create({
      withOrgAccount: true,
      name: 'zzz-owner',
      email: `zzz-owner-${stamp}@test.grant.dev`,
    });
    org = await owner.createOrganization('Members Sort Org');

    const viewerRoleId = await getOrganizationRoleIdByName(org.id, ROLE_VIEWER);
    expect(viewerRoleId).toBeTruthy();

    invitationEmail = `aaa-invite-${stamp}@test.grant.dev`;
    const invitation = await owner.inviteMember(org.id, invitationEmail, viewerRoleId!);
    expect(invitation.status).toBe('pending');
  });

  it.each(SORT_FIELDS.flatMap((field) => SORT_ORDERS.map((order) => ({ field, order }))))(
    'returns 200 and ordered rows for $field $order',
    async ({ field, order }) => {
      const res = await graphqlRequest<OrganizationMembersData>({
        query: print(GetOrganizationMembersDocument),
        variables: {
          scope: { id: org.id, tenant: Tenant.Organization },
          sort: { field, order },
        },
        accessToken: owner.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const page = res.body.data?.organizationMembers;
      expect(page).toBeDefined();
      expect(page!.totalCount).toBeGreaterThanOrEqual(2);

      const members = page!.members;
      const memberRow = members.find((row) => row.type === MemberType.Member);
      const invitationRow = members.find((row) => row.type === MemberType.Invitation);
      expect(memberRow).toBeDefined();
      expect(invitationRow).toBeDefined();
      expect(memberRow!.name).toBe('zzz-owner');
      expect(invitationRow!.email).toBe(invitationEmail);
      expect(invitationRow!.status).toBe('pending');

      const memberIndex = members.findIndex((row) => row.id === memberRow!.id);
      const invitationIndex = members.findIndex((row) => row.id === invitationRow!.id);

      const firstIsMember = (() => {
        switch (field) {
          case OrganizationMemberSortableField.Name:
          case OrganizationMemberSortableField.Email:
            return order === SortOrder.Desc;
          case OrganizationMemberSortableField.Role:
            return order === SortOrder.Asc;
          case OrganizationMemberSortableField.CreatedAt:
            return order === SortOrder.Asc;
          default:
            return order === SortOrder.Desc;
        }
      })();

      if (firstIsMember) {
        expect(memberIndex).toBeLessThan(invitationIndex);
      } else {
        expect(invitationIndex).toBeLessThan(memberIndex);
      }
    }
  );
});
