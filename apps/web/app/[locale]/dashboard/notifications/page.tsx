'use client';

import { useTranslations } from 'next-intl';

import { NotificationCenter } from '@/components/features/notifications';
import { DashboardLayout } from '@/components/layout';
import { usePageTitle } from '@/hooks';

export default function NotificationsPage() {
  const t = useTranslations('notifications');
  usePageTitle('notifications');

  return (
    <DashboardLayout title={t('title')} variant="simple">
      <div className="p-4">
        <NotificationCenter />
      </div>
    </DashboardLayout>
  );
}
