'use client';

import { useTranslations } from 'next-intl';

import { ApiKeyDetailViewer } from '@/components/features/api-key';
import { DashboardLayout } from '@/components/layout';
import { PersonalProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function AccountProjectApiKeyDetailPage() {
  const t = useTranslations('user.apiKeys.detail');
  usePageTitle('user.apiKeys.detail');

  return (
    <DashboardLayout title={t('title')} sidebar={<PersonalProjectSidebar />}>
      <div className="p-4">
        <ApiKeyDetailViewer />
      </div>
    </DashboardLayout>
  );
}
