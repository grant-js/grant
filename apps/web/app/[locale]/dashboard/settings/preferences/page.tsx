'use client';

import { useTranslations } from 'next-intl';

import { SettingPreferences } from '@/components/features/settings';
import { DashboardLayout } from '@/components/layout';
import { SettingsSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function PreferencesSettingsPage() {
  const t = useTranslations('settings.preferences');
  usePageTitle('settings.preferences');

  return (
    <DashboardLayout title={t('title')} variant="simple" sidebar={<SettingsSidebar />}>
      <SettingPreferences />
    </DashboardLayout>
  );
}
