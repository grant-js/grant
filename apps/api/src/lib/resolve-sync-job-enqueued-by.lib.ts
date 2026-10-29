import type { GrantAuth } from '@grantjs/core';
import { TokenType } from '@grantjs/schema';

import { config } from '@/config';

/**
 * True when the token is a project-level API key whose JWT `sub` is the key id (a sentinel,
 * not a `users` row): `sub` equals `jti`.
 */
export function isApiKeyIdActor(auth: GrantAuth | null | undefined): boolean {
  return Boolean(auth?.userId) && auth?.type === TokenType.ApiKey && auth.userId === auth.tokenId;
}

/**
 * Resolves the acting user for anything persisted behind a `users` foreign key: sync/export
 * job `enqueued_by_id`, every audit row's `performed_by` (`DrizzleAuditLogger`), and every
 * `event_log.actor_user_id` (`DrizzleEventPublisher`). The one place this mapping lives; do not
 * repeat it.
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

  if (isApiKeyIdActor(auth)) {
    return config.system.systemUserId;
  }

  return auth.userId;
}
