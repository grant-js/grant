'use client';

import { useEffect, useRef } from 'react';

import { useSearchParams } from 'next/navigation';

import { useLocale } from 'next-intl';

import { AuthPageLayout } from '@/components/layout/AuthPageLayout';
import { validateRedirectUrl } from '@/lib/redirect';
import { useAuthStore } from '@/stores/auth.store';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const REDIRECT_STORAGE_KEY = 'auth_redirect_url';

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { loading, currentAccount } = useAuthStore();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const hasStoredRedirect = useRef(false);

  // Store redirect URL from query params when component mounts
  useEffect(() => {
    const redirectParam = searchParams.get('redirect');
    if (redirectParam && !hasStoredRedirect.current) {
      const validatedUrl = validateRedirectUrl(redirectParam, locale);
      if (validatedUrl) {
        sessionStorage.setItem(REDIRECT_STORAGE_KEY, validatedUrl);
        hasStoredRedirect.current = true;
      }
    }
  }, [searchParams, locale]);

  // Handle redirect after authentication
  useEffect(() => {
    if (loading) return;
    if (currentAccount) {
      // Check for stored redirect URL
      const storedRedirect = sessionStorage.getItem(REDIRECT_STORAGE_KEY);
      if (storedRedirect) {
        sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
        window.location.href = storedRedirect;
      } else {
        window.location.href = `/${locale}/dashboard`;
      }
    }
  }, [currentAccount, locale, loading]);

  return <AuthPageLayout>{children}</AuthPageLayout>;
}
