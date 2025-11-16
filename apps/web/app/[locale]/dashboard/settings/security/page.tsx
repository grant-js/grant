'use client';

import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { usePageTitle } from '@/hooks';

export default function SecuritySettingsPage() {
  const t = useTranslations('settings.security');
  usePageTitle('settings.security');

  return (
    <DashboardPageLayout title={t('title')} variant="simple">
      <p className="text-muted-foreground">{t('description')}</p>
      {/* Security settings content will be implemented here */}
    </DashboardPageLayout>
  );
}
