'use client';

import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { usePageTitle } from '@/hooks';

export default function PreferencesSettingsPage() {
  const t = useTranslations('settings.preferences');
  usePageTitle('settings.preferences');

  return (
    <DashboardPageLayout title={t('title')} variant="simple">
      <p className="text-muted-foreground">{t('description')}</p>
      {/* Preferences settings content will be implemented here */}
    </DashboardPageLayout>
  );
}
