'use client';

import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { usePageTitle } from '@/hooks';

export default function ProfileSettingsPage() {
  const t = useTranslations('settings.profile');
  usePageTitle('settings.profile');

  return (
    <DashboardPageLayout title={t('title')} variant="simple">
      <p className="text-muted-foreground">{t('description')}</p>
      {/* Profile settings content will be implemented here */}
    </DashboardPageLayout>
  );
}
