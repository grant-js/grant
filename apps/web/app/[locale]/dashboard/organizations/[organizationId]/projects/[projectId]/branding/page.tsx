'use client';

import { useTranslations } from 'next-intl';

import { ProjectBrandingViewer } from '@/components/features/projects';
import { DashboardLayout } from '@/components/layout';
import { ProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function OrganizationProjectBrandingPage() {
  const t = useTranslations('projects.branding');
  usePageTitle('projects.branding');

  return (
    <DashboardLayout title={t('title')} sidebar={<ProjectSidebar />}>
      <div className="p-4">
        <ProjectBrandingViewer />
      </div>
    </DashboardLayout>
  );
}
