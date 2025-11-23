'use client';

import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { usePageTitle } from '@/hooks';

export default function PrivacySettingsPage() {
  const t = useTranslations('settings.privacy');
  usePageTitle('settings.privacy');

  return (
    <DashboardPageLayout title={t('title')} variant="simple">
      <PrivacySettings />
    </DashboardPageLayout>
  );
}
