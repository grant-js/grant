'use client';

import { useEffect } from 'react';

import { AccountType } from '@grantjs/schema';
import { useLocale, useTranslations } from 'next-intl';

import {
  OrganizationDeleteDialog,
  OrganizationEditDialog,
  OrganizationPagination,
  OrganizationToolbar,
  OrganizationViewer,
} from '@/components/features/organizations';
import { DashboardLayout } from '@/components/layout';
import { OrganizationWorkspaceSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';
import { useAuthStore } from '@/stores/auth.store';

export default function DashboardPage() {
  const { getCurrentAccount, loading } = useAuthStore();
  const currentAccount = getCurrentAccount();
  const locale = useLocale();
  const t = useTranslations('organizations');
  usePageTitle('organizations');

  useEffect(() => {
    if (loading) return;
    if (currentAccount && currentAccount.type === AccountType.Personal) {
      window.location.href = `/${locale}/dashboard/accounts/${currentAccount.id}`;
    }
  }, [currentAccount, locale, loading]);

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<OrganizationWorkspaceSidebar />}
      actions={<OrganizationToolbar />}
      footer={<OrganizationPagination />}
    >
      <>
        <OrganizationViewer />
        <OrganizationDeleteDialog />
        <OrganizationEditDialog />
      </>
    </DashboardLayout>
  );
}
