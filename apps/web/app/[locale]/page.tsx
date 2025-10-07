'use client';

import { useEffect } from 'react';

import { useLocale } from 'next-intl';

import { FullPageLoader } from '@/components/common';
import { useAuthStore } from '@/stores/auth.store';

export default function HomePage() {
  const { isAuthenticated, loading } = useAuthStore();
  const locale = useLocale();

  useEffect(() => {
    if (loading) return;
    const redirectPath = isAuthenticated() ? `/${locale}/dashboard` : `/${locale}/auth/login`;
    window.location.href = redirectPath;
  }, [isAuthenticated, locale, loading]);

  return <FullPageLoader />;
}
