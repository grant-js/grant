'use client';

import { useTranslations } from 'next-intl';

import { GroupDetailViewer } from '@/components/features/group';
import { DashboardLayout } from '@/components/layout';
import { OrganizationSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function OrganizationGroupDetailPage() {
  const t = useTranslations('group');
  usePageTitle('group.detail');

  return (
    <DashboardLayout title={t('detail.title')} sidebar={<OrganizationSidebar />}>
      <div className="p-4">
        <GroupDetailViewer />
      </div>
    </DashboardLayout>
  );
}
