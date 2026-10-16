'use client';

import { useTranslations } from 'next-intl';

import {
  SettingNoWorkspaceNotice,
  SettingProjectMembershipsList,
} from '@/components/features/settings';
import { DashboardLayout } from '@/components/layout';
import { SettingsSidebar } from '@/components/navigation';
import { useIsAccountless } from '@/hooks/accounts';
import { useAuthSignupPolicy } from '@/hooks/auth';
import { usePageTitle } from '@/hooks/common';
import { useMyProjectMemberships } from '@/hooks/me';

export default function ProjectMembershipsSettingsPage() {
  const t = useTranslations('settings.projectMemberships');
  usePageTitle('settings.projectMemberships');

  const { memberships, loading } = useMyProjectMemberships();
  const isAccountless = useIsAccountless();
  const { publicSignupEnabled, loading: signupPolicyLoading } = useAuthSignupPolicy();
  // The policy defaults to "closed" while it loads, so wait for the answer before saying so.
  const showNoWorkspaceNotice = isAccountless && !signupPolicyLoading && !publicSignupEnabled;

  return (
    <DashboardLayout title={t('title')} variant="simple" sidebar={<SettingsSidebar />}>
      <div className="space-y-6">
        {showNoWorkspaceNotice && <SettingNoWorkspaceNotice />}
        <SettingProjectMembershipsList memberships={memberships} loading={loading} />
      </div>
    </DashboardLayout>
  );
}
