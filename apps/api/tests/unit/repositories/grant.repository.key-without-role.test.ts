/**
 * A project API key row without a role resolves to no roles, and never falls through to the
 * paths that resolve a user's roles by the same id.
 */
import { type DbSchema } from '@grantjs/database';
import { Tenant, TokenType } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { GrantRepository } from '@/repositories/grant.repository';

const organizationId = '10000000-0000-4000-8000-0000000000a1';
const accountId = '10000000-0000-4000-8000-0000000000a2';
const projectId = '10000000-0000-4000-8000-0000000000a3';
const apiKeyId = '10000000-0000-4000-8000-0000000000a4';
const roleId = '10000000-0000-4000-8000-0000000000a5';

function build(row: Record<string, string | null> | undefined) {
  const findFirst = vi.fn().mockResolvedValue(row);
  const select = vi.fn(() => {
    throw new Error('a user path must not run for a key row');
  });
  const db = {
    query: { organizationProjectApiKeys: { findFirst }, accountProjectApiKeys: { findFirst } },
    select,
  } as unknown as DbSchema;
  return { repository: new GrantRepository(db), select };
}

describe.each([
  [
    'organization',
    Tenant.OrganizationProject,
    `${organizationId}:${projectId}`,
    'organizationRoleId',
  ],
  ['account', Tenant.AccountProject, `${accountId}:${projectId}`, 'accountRoleId'],
] as const)(
  'GrantRepository.getUserRoleIdsInScope for a %s project key',
  (_label, tenant, id, column) => {
    it('returns the role of a key that has one', async () => {
      const { repository } = build({ [column]: roleId });

      await expect(
        repository.getUserRoleIdsInScope(apiKeyId, { tenant, id }, undefined, {
          tokenType: TokenType.ApiKey,
        })
      ).resolves.toEqual([roleId]);
    });

    it('returns no role for a key whose role is null, without trying the user paths', async () => {
      const { repository, select } = build({ [column]: null });

      await expect(
        repository.getUserRoleIdsInScope(apiKeyId, { tenant, id }, undefined, {
          tokenType: TokenType.ApiKey,
        })
      ).resolves.toEqual([]);
      expect(select).not.toHaveBeenCalled();
    });
  }
);
