'use client';

import { useTranslations } from 'next-intl';

import { NotificationCenter } from '@/components/features/notifications';
import { DashboardLayout } from '@/components/layout';
import { SettingsSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function NotificationsPage() {
  const t = useTranslations('notifications');
  usePageTitle('notifications');

  return (
    <DashboardLayout title={t('title')} variant="simple" sidebar={<SettingsSidebar />}>
      <NotificationCenter />
    </DashboardLayout>
  );
}
