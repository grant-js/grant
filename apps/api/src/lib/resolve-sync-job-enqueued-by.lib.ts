import type { GrantAuth } from '@grantjs/core';
import { TokenType } from '@grantjs/schema';

import { config } from '@/config';

/**
 * Resolves who enqueued a sync/export job for persistence (`enqueued_by_id` FK → users).
 *
 * Project-level API keys (organization/account project scope) use the API key id as JWT
 * `sub` — a sentinel value, not a row in `users`. Map that auth to the system user so
 * machine callers (e.g. ETL) can enqueue jobs without a bound project user.
 *
 * User-scoped API keys keep the real project user id in `sub` for audit attribution.
 */
export function resolveSyncJobEnqueuedById(auth: GrantAuth | null | undefined): string | null {
  if (!auth?.userId) {
    return null;
  }

  if (auth.type === TokenType.ApiKey && auth.userId === auth.tokenId) {
    return config.system.systemUserId;
  }

  return auth.userId;
}
