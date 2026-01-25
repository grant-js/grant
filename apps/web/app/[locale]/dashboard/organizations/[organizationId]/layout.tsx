'use client';

import { useEffect } from 'react';

import { AccountType } from '@grantjs/schema';
import { useLocale } from 'next-intl';

import { useAuthStore } from '@/stores/auth.store';

interface OrganizationLayoutProps {
  children: React.ReactNode;
}

export default function OrganizationLayout({ children }: OrganizationLayoutProps) {
  const { getCurrentAccount, loading } = useAuthStore();
  const currentAccount = getCurrentAccount();
  const locale = useLocale();

  useEffect(() => {
    if (loading) return;
    if (currentAccount && currentAccount.type === AccountType.Personal) {
      window.location.href = `/${locale}/dashboard/accounts/${currentAccount.id}`;
    }
  }, [locale, currentAccount, loading]);

  return children;
}
