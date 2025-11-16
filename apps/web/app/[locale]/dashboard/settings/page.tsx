'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useLocale } from 'next-intl';

import { FullPageLoader } from '@/components/common';

export default function SettingsPage() {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    // Redirect to account settings by default
    router.replace(`/${locale}/dashboard/settings/account`);
  }, [locale, router]);

  return <FullPageLoader />;
}
