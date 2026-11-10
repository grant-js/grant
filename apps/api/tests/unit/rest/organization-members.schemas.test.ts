import { Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { getOrganizationMembersQuerySchema } from '@/rest/schemas/organization-members.schemas';

const org = '10000000-0000-4000-8000-0000000000a1';
const project = '10000000-0000-4000-8000-0000000000a2';

describe('getOrganizationMembersQuerySchema scope', () => {
  it('accepts an organization scope', () => {
    expect(
      getOrganizationMembersQuerySchema.safeParse({ scopeId: org, tenant: Tenant.Organization })
        .success
    ).toBe(true);
  });

  it('accepts an organizationProject scope with a composite id', () => {
    expect(
      getOrganizationMembersQuerySchema.safeParse({
        scopeId: `${org}:${project}`,
        tenant: Tenant.OrganizationProject,
      }).success
    ).toBe(true);
  });

  it.each([`${org}:`, `${org}:x`, `${org}:${project}:${project}`, 'not-a-uuid'])(
    'rejects the scope id %s',
    (scopeId) => {
      expect(
        getOrganizationMembersQuerySchema.safeParse({
          scopeId,
          tenant: Tenant.OrganizationProject,
        }).success
      ).toBe(false);
    }
  );

  it('rejects a tenant other than organization and organizationProject', () => {
    expect(
      getOrganizationMembersQuerySchema.safeParse({ scopeId: org, tenant: Tenant.Account }).success
    ).toBe(false);
  });
});
