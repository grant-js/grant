import { Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { getOrganizationMembersQuerySchema } from '@/rest/schemas/organization-members.schemas';

const query = {
  scopeId: '10000000-0000-4000-8000-000000000011',
  tenant: Tenant.Organization,
};

describe('getOrganizationMembersQuerySchema public limit', () => {
  it('accepts a missing limit and an in-range page size', () => {
    expect(getOrganizationMembersQuerySchema.parse(query).limit).toBeUndefined();
    expect(getOrganizationMembersQuerySchema.parse({ ...query, limit: 50 }).limit).toBe(50);
  });

  it('rejects public limit -1', () => {
    expect(() => getOrganizationMembersQuerySchema.parse({ ...query, limit: -1 })).toThrow();
  });

  it('rejects a limit above the public max', () => {
    expect(() => getOrganizationMembersQuerySchema.parse({ ...query, limit: 101 })).toThrow();
  });
});
