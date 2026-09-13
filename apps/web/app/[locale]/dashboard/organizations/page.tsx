'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AccountType } from '@grantjs/schema';

import {
  OrganizationDeleteDialog,
  OrganizationEditDialog,
  OrganizationPagination,
  OrganizationPictureUploadDialog,
  OrganizationToolbar,
  OrganizationViewer,
} from '@/components/features/organizations';
import { DashboardLayout } from '@/components/layout';
import { OrganizationWorkspaceSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth.store';

export default function DashboardPage() {
  const { getCurrentAccount, loading } = useAuthStore();
  const currentAccount = getCurrentAccount();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('organizations');
  usePageTitle('organizations');

  useEffect(() => {
    if (loading) return;
    if (!currentAccount || currentAccount.type !== AccountType.Personal) return;
    if (pathname !== '/dashboard/organizations' && pathname !== '/dashboard/organizations/') return;
    router.push(`/dashboard/accounts/${currentAccount.id}`);
  }, [currentAccount, loading, router, pathname]);

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
        <OrganizationPictureUploadDialog />
      </>
    </DashboardLayout>
  );
}
