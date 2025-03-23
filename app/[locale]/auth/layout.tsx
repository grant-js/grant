'use client';

import { useTranslations } from 'next-intl';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const t = useTranslations('auth');

  return (
    <div className="min-h-[calc(100vh-3.5rem)] grid lg:grid-cols-2">
      {/* Left side - Auth forms */}
      <div className="flex items-center justify-center p-6 sm:p-4">
        <div className="w-full max-w-sm">{children}</div>
      </div>

      {/* Right side - Image or gradient */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-400 p-8">
        <div className="max-w-md text-white space-y-4">
          <h2 className="text-3xl font-bold">{t('welcome.title')}</h2>
          <p className="text-lg opacity-90">{t('welcome.description')}</p>
        </div>
      </div>
    </div>
  );
}
