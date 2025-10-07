'use client';

import { useEffect } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import { useAuthStore } from '@/stores/auth.store';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const t = useTranslations('auth');
  const { loading, currentAccount } = useAuthStore();
  const locale = useLocale();

  useEffect(() => {
    if (loading) return;
    if (currentAccount) {
      window.location.href = `/${locale}/dashboard`;
    }
  }, [currentAccount, locale, loading]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] grid lg:grid-cols-2">
      {/* Left side - Auth forms */}
      <div className="flex items-center justify-center p-6 sm:p-4">
        <div className="w-full max-w-sm">{children}</div>
      </div>

      {/* Right side - Protection concept image with gradient overlay */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-r from-blue-600/90 to-blue-400/90 p-8 relative overflow-hidden">
        {/* Background protection concept image with black and white filter */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat filter grayscale opacity-40"
          style={{
            backgroundImage: `url('/protection-concept-with-lock.jpg')`,
            backgroundPosition: 'center bottom',
          }}
        />
        {/* Blue gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-blue-400/90" />
        <div className="max-w-lg text-white relative z-10">
          <div className="flex items-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">{t('welcome.title')}</h2>
              <p className="text-lg opacity-90">{t('welcome.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
