'use client';

import { useTranslations } from 'next-intl';
import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { usePageTitle } from '@/hooks';

export default function SettingsPage() {
  const t = useTranslations('settings');
  usePageTitle('settings');

  return (
    <DashboardPageLayout title={t('title')} variant="simple">
      <p className="text-muted-foreground">{t('description')}</p>
    </DashboardPageLayout>
  );
}
