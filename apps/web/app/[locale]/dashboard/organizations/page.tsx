'use client';

import { useEffect } from 'react';

import { AccountType } from '@logusgraphics/grant-schema';
import { useLocale, useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { DeleteOrganizationDialog } from '@/components/features/organizations/DeleteOrganizationDialog';
import { EditOrganizationDialog } from '@/components/features/organizations/EditOrganizationDialog';
import { OrganizationPagination } from '@/components/features/organizations/OrganizationPagination';
import { OrganizationToolbar } from '@/components/features/organizations/OrganizationToolbar';
import { OrganizationViewer } from '@/components/features/organizations/OrganizationViewer';
import { usePageTitle } from '@/hooks';
import { useAuthStore } from '@/stores/auth.store';

export default function DashboardPage() {
  const { currentAccount, loading } = useAuthStore();
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
    <DashboardPageLayout
      title={t('title')}
      actions={<OrganizationToolbar />}
      footer={<OrganizationPagination />}
    >
      <>
        <OrganizationViewer />
        <DeleteOrganizationDialog />
        <EditOrganizationDialog />
      </>
    </DashboardPageLayout>
  );
}
