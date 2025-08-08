'use client';

import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { usePageTitle } from '@/hooks';

export function OrganizationsPage() {
  const t = useTranslations('organizations');
  usePageTitle('organizations');

  return (
    <DashboardPageLayout
      title={t('title')}
      actions={<div>Actions will go here</div>}
      footer={<div>Pagination will go here</div>}
    >
      <div className="p-6">
        <p>Organizations list will be implemented here.</p>
      </div>
    </DashboardPageLayout>
  );
}
