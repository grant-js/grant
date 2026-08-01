'use client';

import { useTranslations } from 'next-intl';

import { SettingProjectMembershipsList } from '@/components/features/settings';
import { DashboardLayout } from '@/components/layout';
import { SettingsSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks/common';
import { useMyProjectMemberships } from '@/hooks/me';

export default function ProjectMembershipsSettingsPage() {
  const t = useTranslations('settings.projectMemberships');
  usePageTitle('settings.projectMemberships');

  const { memberships, loading } = useMyProjectMemberships();

  return (
    <DashboardLayout title={t('title')} variant="simple" sidebar={<SettingsSidebar />}>
      <SettingProjectMembershipsList memberships={memberships} loading={loading} />
    </DashboardLayout>
  );
}
