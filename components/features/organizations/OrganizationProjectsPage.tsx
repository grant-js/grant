'use client';

import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { usePageTitle } from '@/hooks';

interface OrganizationProjectsPageProps {
  organizationId: string;
}

export function OrganizationProjectsPage({ organizationId }: OrganizationProjectsPageProps) {
  const t = useTranslations('organization.projects');
  usePageTitle('organization.projects');

  return (
    <DashboardPageLayout
      title={t('title')}
      actions={<div>Actions will go here</div>}
      footer={<div>Pagination will go here</div>}
    >
      <div className="p-6">
        <p>Projects for organization {organizationId} will be implemented here.</p>
      </div>
    </DashboardPageLayout>
  );
}
