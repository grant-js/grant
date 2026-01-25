'use client';

import { useTranslations } from 'next-intl';

import { DashboardLayout } from '@/components/layout';
import { usePageTitle } from '@/hooks';

export default function AccountPage() {
  const t = useTranslations('account');
  usePageTitle('account');

  return (
    <DashboardLayout title={t('title')} variant="simple">
      <p className="text-muted-foreground">{t('description')}</p>
    </DashboardLayout>
  );
}
