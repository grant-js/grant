'use client';

import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { usePageTitle } from '@/hooks';

export default function AccountSettingsPage() {
  const t = useTranslations('settings.account');
  usePageTitle('settings.account');

  return (
    <DashboardPageLayout title={t('title')} variant="simple">
      <p className="text-muted-foreground">{t('description')}</p>
      {/* Account settings content will be implemented here */}
    </DashboardPageLayout>
  );
}
