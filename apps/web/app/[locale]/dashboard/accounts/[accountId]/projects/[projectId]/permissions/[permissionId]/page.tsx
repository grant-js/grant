'use client';

import { useTranslations } from 'next-intl';

import { PermissionDetailViewer } from '@/components/features/permission';
import { DashboardLayout } from '@/components/layout';
import { PersonalProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function AccountProjectPermissionDetailPage() {
  const t = useTranslations('permission');
  usePageTitle('permission.detail');

  return (
    <DashboardLayout title={t('detail.title')} sidebar={<PersonalProjectSidebar />}>
      <div className="p-4">
        <PermissionDetailViewer />
      </div>
    </DashboardLayout>
  );
}
