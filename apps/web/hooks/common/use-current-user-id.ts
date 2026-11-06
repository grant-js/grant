'use client';

import { AccountType } from '@grantjs/schema';

import { useAuthStore } from '@/stores/auth.store';

/**
 * Id of the signed-in user, or null while it is unknown.
 *
 * The auth store keeps accounts, not a user: the owner of the user's personal account is the
 * user. Organization accounts are skipped because their owner can be someone else.
 */
export function useCurrentUserId(): string | null {
  return useAuthStore(
    (state) =>
      state.accounts.find((account) => account.type === AccountType.Personal)?.ownerId ?? null
  );
}
