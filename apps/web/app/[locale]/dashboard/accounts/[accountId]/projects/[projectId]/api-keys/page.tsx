'use client';

import { useTranslations } from 'next-intl';

import { ApiKeyPagination, ApiKeyToolbar, ApiKeyViewer } from '@/components/features/api-keys';
import { DashboardLayout } from '@/components/layout';
import { PersonalProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function PersonalProjectApiKeysPage() {
  const t = useTranslations('user.apiKeys');
  usePageTitle('user.apiKeys');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<PersonalProjectSidebar />}
      actions={<ApiKeyToolbar />}
      footer={<ApiKeyPagination />}
    >
      <ApiKeyViewer />
    </DashboardLayout>
  );
}
