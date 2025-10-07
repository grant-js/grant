'use client';

import { useEffect } from 'react';

import { useLocale } from 'next-intl';

import { FullPageLoader } from '@/components/common';
import { getRedirectPath } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth.store';

export default function DashboardPage() {
  const { currentAccount, clearAuth, loading } = useAuthStore();
  const locale = useLocale();

  useEffect(() => {
    if (loading) return;
    if (currentAccount) {
      const redirectTo = getRedirectPath(currentAccount.type, currentAccount.id, locale);
      window.location.href = redirectTo;
    }
  }, [currentAccount, locale, clearAuth, loading]);

  return <FullPageLoader />;
}
