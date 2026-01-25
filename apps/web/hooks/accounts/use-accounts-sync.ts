import { useEffect } from 'react';

import { useLocale } from 'next-intl';

import { useMe } from '@/hooks/auth';
import { useAuthStore } from '@/stores/auth.store';

interface WindowWithGrantFlag extends Window {
  __grantRedirectInProgress?: boolean;
}

function isRedirectInProgress(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.pathname.includes('/auth/login')) return true;
  return (window as WindowWithGrantFlag).__grantRedirectInProgress === true;
}

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

    if (isRedirectInProgress()) {
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
