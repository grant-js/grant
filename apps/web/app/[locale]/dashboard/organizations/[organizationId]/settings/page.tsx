'use client';

import { useTranslations } from 'next-intl';

import {
  OrganizationDeleteDialog,
  OrganizationPictureUploadDialog,
  OrganizationSettings,
} from '@/components/features/organizations';
import { DashboardLayout } from '@/components/layout';
import { OrganizationSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function OrganizationSettingsPage() {
  const t = useTranslations('organizations.settings');
  usePageTitle('organizations.settings');

  return (
    <DashboardLayout title={t('title')} variant="simple" sidebar={<OrganizationSidebar />}>
      <>
        <OrganizationSettings />
        <OrganizationDeleteDialog />
        <OrganizationPictureUploadDialog />
      </>
    </DashboardLayout>
  );
}
