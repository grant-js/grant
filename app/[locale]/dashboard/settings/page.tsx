'use client';

import { useTranslations } from 'next-intl';
import { DashboardPageTitle } from '@/components/DashboardPageTitle';

export default function SettingsPage() {
  const t = useTranslations('settings');

  return (
    <div className="space-y-8">
      <DashboardPageTitle title={t('title')} />
      <p className="text-muted-foreground">{t('description')}</p>
    </div>
  );
}
