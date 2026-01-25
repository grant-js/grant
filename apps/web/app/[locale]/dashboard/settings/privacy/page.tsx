'use client';

import { useTranslations } from 'next-intl';

import { SettingPrivacy } from '@/components/features/settings';
import { DashboardLayout } from '@/components/layout';
import { SettingsSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function PrivacySettingsPage() {
  const t = useTranslations('settings.privacy');
  usePageTitle('settings.privacy');

  return (
    <DashboardLayout title={t('title')} variant="simple" sidebar={<SettingsSidebar />}>
      <SettingPrivacy />
    </DashboardLayout>
  );
}
