/**
 * The permission layer's answer for a user who owns no account, belongs to no
 * organization and holds no direct grant: "no" for every resource, action and scope.
 *
 * That answer is what the GraphQL and REST guards (account-less-access tests next to the
 * transports) turn into a refusal, so it is what makes an account-less session harmless
 * server-side. Built from the real `Grant`, `PermissionChecker` and `GrantService`; only
 * the repository is a stand-in, modelling what its SQL returns for such a user: no role
 * in any scope (roles resolve only through account ownership or organization membership)
 * and no group or permission rows.
 *
 * What this does not cover: grants held directly by a user (`user_permissions`,
 * `user_groups`) are not bound to a scope, so a user who has one holds it in any scope.
 * That is existing, tested behaviour (grant.service.test.ts) and is described in the PR.
 */
import type { IGrantRepository } from '@grantjs/core';
import { Grant } from '@grantjs/core';
import { AuthorizationReason, Tenant, TokenType } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import type { IEntityCacheAdapter } from '@/lib/cache';
import { GrantService } from '@/services/grant.service';
import type { SigningKeyService } from '@/services/signing-keys.service';

const OWNER_ID = '10000000-0000-4000-8000-000000000001';
const ACCOUNT_LESS_ID = '10000000-0000-4000-8000-000000000002';
const OWN_ACCOUNT = '20000000-0000-4000-8000-000000000001';
const OWNER_ROLE = '30000000-0000-4000-8000-000000000001';
const OWNER_PERMISSION = '40000000-0000-4000-8000-000000000001';

/** What the database holds: one owner with one account and one role granting one permission. */
function repository(): IGrantRepository {
  return {
    getUserRoleIdsInScope: vi.fn(async (userId: string, scope: { tenant: Tenant; id: string }) =>
      userId === OWNER_ID && scope.tenant === Tenant.Account && scope.id === OWN_ACCOUNT
        ? [OWNER_ROLE]
        : []
    ),
    getGroupIdsForRoles: vi.fn().mockResolvedValue([]),
    getDirectGroupIdsForUser: vi.fn().mockResolvedValue([]),
    getPermissionIdsForGroups: vi.fn().mockResolvedValue([]),
    getDirectPermissionIdsForRoles: vi.fn(async (roleIds: string[]) =>
      roleIds.includes(OWNER_ROLE) ? [OWNER_PERMISSION] : []
    ),
    getDirectPermissionIdsForUser: vi.fn().mockResolvedValue([]),
    getPermissionsByIds: vi.fn(async (ids: string[]) =>
      ids.includes(OWNER_PERMISSION)
        ? [
            {
              id: OWNER_PERMISSION,
              condition: null,
              action: 'query',
              resource: { slug: 'project' },
            },
          ]
        : []
    ),
    getUser: vi.fn(),
  } as unknown as IGrantRepository;
}

function grantFor(userId: string, scope: { tenant: Tenant; id: string }): Grant {
  const service = new GrantService(
    {} as IEntityCacheAdapter,
    repository(),
    {} as SigningKeyService
  );
  const grant = new Grant(service, {} as never);
  grant.auth = {
    userId,
    scope,
    type: TokenType.Session,
    expiresAt: Math.floor(Date.now() / 1000) + 600,
    tokenId: 'token-1',
    isVerified: true,
    mfaVerified: true,
  };
  return grant;
}

const SCOPE_IDS = [
  OWN_ACCOUNT,
  `${OWN_ACCOUNT}:50000000-0000-4000-8000-000000000001`,
  '60000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001:50000000-0000-4000-8000-000000000001',
];

const PERMISSIONS = [
  { resource: 'organization', action: 'create' },
  { resource: 'organization', action: 'query' },
  { resource: 'project', action: 'query' },
  { resource: 'project', action: 'create' },
  { resource: 'user', action: 'query' },
  { resource: 'role', action: 'create' },
  { resource: 'api-key', action: 'create' },
  { resource: 'organization-member', action: 'update' },
];

describe('a user with no account, membership or grant', () => {
  it.each(Object.values(Tenant).flatMap((tenant) => SCOPE_IDS.map((id) => [tenant, id] as const)))(
    'is denied every permission in the %s scope %s',
    async (tenant, id) => {
      const grant = grantFor(ACCOUNT_LESS_ID, { tenant, id });

      for (const permission of PERMISSIONS) {
        const result = await grant.isAuthorized(permission as never, {});
        expect(result.authorized, `${permission.resource}:${permission.action}`).toBe(false);
        expect(result.reason).toBe(AuthorizationReason.NoMatchingPermissionFound);
      }
    }
  );
});

describe('control: the same checks for an account owner', () => {
  it('grants the owner their permission in their own account', async () => {
    const grant = grantFor(OWNER_ID, { tenant: Tenant.Account, id: OWN_ACCOUNT });

    const result = await grant.isAuthorized({ resource: 'project', action: 'query' } as never, {});

    expect(result.authorized).toBe(true);
  });

  it('denies the owner the same permission in an account that is not theirs', async () => {
    const grant = grantFor(OWNER_ID, {
      tenant: Tenant.Account,
      id: '60000000-0000-4000-8000-000000000001',
    });

    const result = await grant.isAuthorized({ resource: 'project', action: 'query' } as never, {});

    expect(result.authorized).toBe(false);
  });
});
