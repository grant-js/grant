'use client';

import { useTranslations } from 'next-intl';

import {
  OrganizationDeleteDialog,
  OrganizationSettings,
} from '@/components/features/organizations';
import { DashboardLayout } from '@/components/layout';
import { OrganizationSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function OrganizationSettingsPage() {
  const t = useTranslations('organizations.settings');
  usePageTitle('organizations.settings');

  return (
    <DashboardLayout title={t('title')} sidebar={<OrganizationSidebar />}>
      <>
        <OrganizationSettings />
        <OrganizationDeleteDialog />
      </>
    </DashboardLayout>
  );
}
