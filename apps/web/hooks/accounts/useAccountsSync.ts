import { useEffect } from 'react';

import { useLocale } from 'next-intl';

import { useMe } from '@/hooks/auth';
import { useAuthStore } from '@/stores/auth.store';

export function useAccountsSync() {
  const locale = useLocale();
  const { syncFromMe, isAuthenticated, clearAuth, loading: storeLoading } = useAuthStore();
  const {
    accounts,
    email,
    requiresEmailVerification,
    verificationExpiry,
    loading: meLoading,
  } = useMe();

  const loading = storeLoading || meLoading;

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAuthenticated()) {
      clearAuth();
      window.location.href = `/${locale}/auth/login`;
      return;
    }

    syncFromMe({
      accounts,
      email,
      requiresEmailVerification,
      verificationExpiry,
    });
  }, [
    accounts,
    email,
    requiresEmailVerification,
    verificationExpiry,
    loading,
    isAuthenticated,
    syncFromMe,
    clearAuth,
    locale,
  ]);
}
