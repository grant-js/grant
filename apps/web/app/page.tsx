'use client';

import { useEffect } from 'react';

import { FullPageLoader } from '@/components/common';
import { defaultLocale } from '@/i18n/routing';

export default function RootPage() {
  useEffect(() => {
    window.location.href = `/${defaultLocale}`;
  }, []);

  return <FullPageLoader />;
}
