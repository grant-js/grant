'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { SettingProjectMembershipDetail } from '@/components/features/settings';
import { DashboardLayout } from '@/components/layout';
import { SettingsSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks/common';
import { useMyMutations, useMyProjectMembership } from '@/hooks/me';
import { Link } from '@/i18n/navigation';

export default function ProjectMembershipDetailSettingsPage() {
  const t = useTranslations('settings.projectMemberships');
  usePageTitle('settings.projectMemberships');

  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const { membership, loading } = useMyProjectMembership(projectId);
  const { updateMyProjectMembership, uploadMyProjectMembershipPicture } = useMyMutations();

  if (loading && !membership) {
    return (
      <DashboardLayout title={t('title')} variant="simple" sidebar={<SettingsSidebar />}>
        <p className="text-sm text-muted-foreground">{t('detail.loading')}</p>
      </DashboardLayout>
    );
  }

  if (!membership) {
    return (
      <DashboardLayout title={t('title')} variant="simple" sidebar={<SettingsSidebar />}>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>{t('detail.notFound')}</p>
          <Link href="/dashboard/settings/projects" className="text-primary hover:underline">
            {t('goToYourMemberships')}
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={membership.projectName} variant="simple" sidebar={<SettingsSidebar />}>
      <SettingProjectMembershipDetail
        membership={membership}
        onSubmit={async (values) => {
          await updateMyProjectMembership({
            projectId,
            displayName: values.displayName,
          });
        }}
        onUploadPicture={async (file, filename, contentType) => {
          await uploadMyProjectMembershipPicture({
            projectId,
            file,
            filename,
            contentType,
          });
        }}
      />
    </DashboardLayout>
  );
}
