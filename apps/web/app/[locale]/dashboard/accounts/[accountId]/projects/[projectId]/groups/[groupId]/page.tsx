'use client';

import { useTranslations } from 'next-intl';

import { GroupDetailViewer } from '@/components/features/group';
import { DashboardLayout } from '@/components/layout';
import { PersonalProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function AccountProjectGroupDetailPage() {
  const t = useTranslations('group');
  usePageTitle('group.detail');

  return (
    <DashboardLayout title={t('detail.title')} sidebar={<PersonalProjectSidebar />}>
      <div className="p-4">
        <GroupDetailViewer />
      </div>
    </DashboardLayout>
  );
}
