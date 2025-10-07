'use client';

import { useEffect } from 'react';

import { AccountType } from '@logusgraphics/grant-schema';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';

import { FullPageLoader } from '@/components/common';
import { useAuthStore } from '@/stores/auth.store';

export default function AccountPage() {
  const { currentAccount, loading } = useAuthStore();
  const currentLocale = useLocale();
  const params = useParams();

  useEffect(() => {
    if (loading) return;
    if (currentAccount && currentAccount.type === AccountType.Personal) {
      window.location.href = `/${currentLocale}/dashboard/accounts/${currentAccount.id}/projects`;
    }
  }, [currentLocale, params, currentAccount, loading]);

  return <FullPageLoader />;
}
