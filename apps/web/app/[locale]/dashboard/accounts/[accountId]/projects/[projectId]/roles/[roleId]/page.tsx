'use client';

import { useTranslations } from 'next-intl';

import { RoleDetailViewer } from '@/components/features/role';
import { DashboardLayout } from '@/components/layout';
import { PersonalProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function AccountProjectRoleDetailPage() {
  const t = useTranslations('role');
  usePageTitle('role.detail');

  return (
    <DashboardLayout title={t('detail.title')} sidebar={<PersonalProjectSidebar />}>
      <div className="p-4">
        <RoleDetailViewer />
      </div>
    </DashboardLayout>
  );
}
