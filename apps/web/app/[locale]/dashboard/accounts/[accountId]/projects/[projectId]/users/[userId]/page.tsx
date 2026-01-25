'use client';

import { useTranslations } from 'next-intl';

import { UserDetailViewer } from '@/components/features/user';
import { DashboardLayout } from '@/components/layout';
import { PersonalProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function PersonalProjectUserDetailPage() {
  const t = useTranslations('user');
  usePageTitle('user.detail');

  return (
    <DashboardLayout
      title={t('detail.title')}
      sidebar={<PersonalProjectSidebar />}
      variant="simple"
    >
      <UserDetailViewer />
    </DashboardLayout>
  );
}
