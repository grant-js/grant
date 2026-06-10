import type { GrantAuth } from '@grantjs/core';
import { Scope, Tenant, TokenType } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { config } from '@/config';
import { resolveSyncJobEnqueuedById } from '@/lib/resolve-sync-job-enqueued-by.lib';

const projectUserId = '30000000-0000-4000-8000-000000000099';
const apiKeyId = 'd1bfe5e5-a05d-4e74-8e5e-5c1a64de802b';
const orgProjectScope: Scope = {
  tenant: Tenant.OrganizationProject,
  id: 'org-1:project-1',
};

function auth(overrides: Partial<GrantAuth>): GrantAuth {
  return {
    userId: projectUserId,
    tokenId: 'token-1',
    expiresAt: Date.now() + 60_000,
    type: TokenType.Session,
    ...overrides,
  };
}

describe('resolveSyncJobEnqueuedById', () => {
  it('returns null when auth is missing', () => {
    expect(resolveSyncJobEnqueuedById(null)).toBeNull();
    expect(resolveSyncJobEnqueuedById(undefined)).toBeNull();
  });

  it('returns session user id for interactive users', () => {
    expect(resolveSyncJobEnqueuedById(auth({ type: TokenType.Session }))).toBe(projectUserId);
  });

  it('returns system user id for project-level API keys (sub equals jti)', () => {
    expect(
      resolveSyncJobEnqueuedById(
        auth({
          type: TokenType.ApiKey,
          userId: apiKeyId,
          tokenId: apiKeyId,
          scope: orgProjectScope,
        })
      )
    ).toBe(config.system.systemUserId);
  });

  it('returns project user id for user-scoped API keys (sub differs from jti)', () => {
    expect(
      resolveSyncJobEnqueuedById(
        auth({
          type: TokenType.ApiKey,
          userId: projectUserId,
          tokenId: apiKeyId,
          scope: { tenant: Tenant.ProjectUser, id: `project-1:${projectUserId}` },
        })
      )
    ).toBe(projectUserId);
  });
});
