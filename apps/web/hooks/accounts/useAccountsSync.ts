import { useEffect, useMemo, useRef } from 'react';

import { useAuthStore } from '@/stores/auth.store';

import { useAccounts } from './useAccounts';

export function useAccountsSync() {
  const {
    accounts: storeAccounts,
    currentAccount,
    updateAccountsAndSwitch,
    isAuthenticated,
  } = useAuthStore();

  const accountIds = useMemo(() => {
    if (storeAccounts.length === 0) {
      return null;
    }
    return storeAccounts.map((account) => account.id);
  }, [storeAccounts]);

  const { accounts: queryAccounts, loading } = useAccounts({ ids: accountIds });
  const previousAccountsRef = useRef<typeof queryAccounts>([]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      return;
    }

    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (queryAccounts.length > 0) {
        previousAccountsRef.current = queryAccounts;
      }
      return;
    }

    if (loading) {
      return;
    }

    const accountsChanged =
      queryAccounts.length !== previousAccountsRef.current.length ||
      queryAccounts.some((account, index) => {
        const prevAccount = previousAccountsRef.current[index];
        if (!prevAccount) return true;

        return (
          account.id !== prevAccount.id ||
          account.owner?.name !== prevAccount.owner?.name ||
          account.owner?.id !== prevAccount.owner?.id ||
          account.name !== prevAccount.name ||
          account.slug !== prevAccount.slug
        );
      });

    if (accountsChanged && queryAccounts.length > 0) {
      const currentAccountId = currentAccount?.id;
      updateAccountsAndSwitch(queryAccounts, currentAccountId);
      previousAccountsRef.current = queryAccounts;
    }
  }, [queryAccounts, loading, isAuthenticated, currentAccount?.id, updateAccountsAndSwitch]);
}
