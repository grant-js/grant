import { getTranslations } from 'next-intl/server';

interface AuthLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const t = await getTranslations('auth');

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
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
