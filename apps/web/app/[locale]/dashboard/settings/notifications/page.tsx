'use client';

import { useTranslations } from 'next-intl';

import { NotificationPreferences } from '@/components/features/notifications';
import { DashboardLayout } from '@/components/layout';
import { SettingsSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function NotificationPreferencesSettingsPage() {
  const t = useTranslations('notificationPreferences');
  usePageTitle('notificationPreferences');

  return (
    <DashboardLayout title={t('title')} variant="simple" sidebar={<SettingsSidebar />}>
      <NotificationPreferences />
    </DashboardLayout>
  );
}
