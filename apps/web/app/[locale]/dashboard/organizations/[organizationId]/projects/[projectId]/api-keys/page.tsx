'use client';

import { useTranslations } from 'next-intl';

import { ApiKeyPagination, ApiKeyToolbar, ApiKeyViewer } from '@/components/features/api-keys';
import { DashboardLayout } from '@/components/layout';
import { ProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function OrganizationProjectApiKeysPage() {
  const t = useTranslations('user.apiKeys');
  usePageTitle('user.apiKeys');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<ProjectSidebar />}
      actions={<ApiKeyToolbar />}
      footer={<ApiKeyPagination />}
    >
      <ApiKeyViewer />
    </DashboardLayout>
  );
}
