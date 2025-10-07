'use client';

import { useEffect } from 'react';

import { AccountType } from '@logusgraphics/grant-schema';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';

import { FullPageLoader } from '@/components/common';
import { useAuthStore } from '@/stores/auth.store';

export default function OrganizationPage() {
  const { currentAccount, loading, clearAuth } = useAuthStore();
  const locale = useLocale();
  const params = useParams();

  useEffect(() => {
    if (loading) return;
    if (currentAccount && currentAccount.type === AccountType.Organization) {
      const organizationId = params.organizationId as string;
      window.location.href = `/${locale}/dashboard/organizations/${organizationId}/projects`;
    }
  }, [locale, params, currentAccount, loading, clearAuth]);

  return <FullPageLoader />;
}
