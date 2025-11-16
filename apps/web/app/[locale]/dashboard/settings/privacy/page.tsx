'use client';

import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { usePageTitle } from '@/hooks';

export default function PrivacySettingsPage() {
  const t = useTranslations('settings.privacy');
  usePageTitle('settings.privacy');

  return (
    <DashboardPageLayout title={t('title')} variant="simple">
      <p className="text-muted-foreground">{t('description')}</p>
      {/* Privacy settings content will be implemented here */}
    </DashboardPageLayout>
  );
}
