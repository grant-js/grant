import { Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { getOrganizationMembersParamsSchema } from '@/services/organization-members.schemas';

const scope = { id: '10000000-0000-4000-8000-000000000011', tenant: Tenant.Organization };

describe('getOrganizationMembersParamsSchema public limit', () => {
  it('accepts a missing limit and an in-range page size', () => {
    expect(getOrganizationMembersParamsSchema.parse({ scope }).limit).toBeUndefined();
    expect(getOrganizationMembersParamsSchema.parse({ scope, limit: 50 }).limit).toBe(50);
  });

  it('rejects public limit -1', () => {
    expect(() => getOrganizationMembersParamsSchema.parse({ scope, limit: -1 })).toThrow();
  });

  it('rejects a limit above the public max', () => {
    expect(() => getOrganizationMembersParamsSchema.parse({ scope, limit: 101 })).toThrow();
  });
});
