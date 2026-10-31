'use client';

import { useTranslations } from 'next-intl';

import { ApiKeyDetailViewer } from '@/components/features/api-key';
import { DashboardLayout } from '@/components/layout';
import { ProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function OrganizationProjectApiKeyDetailPage() {
  const t = useTranslations('user.apiKeys.detail');
  usePageTitle('user.apiKeys.detail');

  return (
    <DashboardLayout title={t('title')} sidebar={<ProjectSidebar />}>
      <div className="p-4">
        <ApiKeyDetailViewer />
      </div>
    </DashboardLayout>
  );
}
