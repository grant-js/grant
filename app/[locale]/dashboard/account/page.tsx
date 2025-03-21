'use client';

import { useTranslations } from 'next-intl';

export default function AccountPage() {
  const t = useTranslations('account');

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('title')}</h2>
      </div>
      <p className="text-muted-foreground">{t('description')}</p>
    </div>
  );
}
