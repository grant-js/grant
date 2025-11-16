'use client';

import { useTranslations } from 'next-intl';

import { PreferencesSettings } from '@/components/settings/PreferencesSettings';
import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { usePageTitle } from '@/hooks';

export default function PreferencesSettingsPage() {
  const t = useTranslations('settings.preferences');
  usePageTitle('settings.preferences');

  return (
    <DashboardPageLayout title={t('title')} variant="simple">
      <PreferencesSettings />
    </DashboardPageLayout>
  );
}
