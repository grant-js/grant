'use client';

import { useTranslations } from 'next-intl';

import { ProjectOAuthConnectionsViewer } from '@/components/features/project-oauth-connections';
import { DashboardLayout } from '@/components/layout';
import { ProjectSidebar } from '@/components/navigation';
import { usePageTitle, useScopeFromParams } from '@/hooks';

export default function OrganizationProjectOAuthConnectionsPage() {
  const t = useTranslations('projects.oauthConnections');
  usePageTitle('projects.oauthConnections');
  const scope = useScopeFromParams();

  return (
    <DashboardLayout title={t('title')} sidebar={<ProjectSidebar />}>
      <div className="p-4">
        <ProjectOAuthConnectionsViewer scope={scope} />
      </div>
    </DashboardLayout>
  );
}
