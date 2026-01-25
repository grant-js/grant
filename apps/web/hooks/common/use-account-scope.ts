'use client';

import { useParams } from 'next/navigation';

import { Scope, Tenant } from '@grantjs/schema';

import { useAuthStore } from '@/stores/auth.store';

export function useAccountScope(): Scope | null {
  const params = useParams();

  const { currentAccountId } = useAuthStore();

  if (params.accountId) {
    return {
      tenant: Tenant.Account,
      id: params.accountId as string,
    };
  }

  if (currentAccountId) {
    return {
      tenant: Tenant.Account,
      id: currentAccountId!,
    };
  }

  return null;
}
