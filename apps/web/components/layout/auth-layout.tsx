'use client';

import { useTranslations } from 'next-intl';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  const t = useTranslations('auth');

  return (
    <div className="min-h-[calc(100vh-3.5rem-1px)] grid lg:grid-cols-2">
      {/* Left side - Content */}
      <div className="flex items-center justify-center p-6 sm:p-4">
        <div className="w-full max-w-sm space-y-6">
          {(title || description) && (
            <div className="space-y-2">
              {title && <h1 className="text-3xl font-bold">{title}</h1>}
              {description && <p className="text-gray-500">{description}</p>}
            </div>
          )}
          {children}
        </div>
      </div>

      {/* Right side - Welcome message */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-r from-blue-600/90 to-blue-400/90 p-8 relative overflow-hidden">
        {/* Background image with gradient overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/grant-auth-bg.jpg')`,
            backgroundPosition: 'center bottom',
          }}
        />
        {/* Blue gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-blue-500/90" />
        <div className="max-w-lg text-white relative z-10">
          <div className="flex items-center">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">{t('welcome.title')}</h2>
              <p className="text-xl opacity-90">{t('welcome.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
