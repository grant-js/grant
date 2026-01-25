'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { ShieldX, Home, ArrowLeft, LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks';
import { useAuthStore } from '@/stores/auth.store';

export default function ForbiddenPage() {
  const t = useTranslations('errors');
  const params = useParams();
  const locale = params.locale as string;
  const { getCurrentAccount } = useAuthStore();
  const isAuthenticated = !!getCurrentAccount();

  usePageTitle('errors.forbidden');

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Animated icon */}
        <div className="relative mx-auto mb-8 h-32 w-32">
          <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-slate-500/20 to-zinc-500/20" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-500/10 to-zinc-500/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldX className="h-16 w-16 text-muted-foreground" strokeWidth={1.5} />
          </div>
        </div>

        {/* Error code */}
        <div className="mb-4">
          <span className="text-8xl font-black tracking-tighter bg-gradient-to-r from-slate-600 to-zinc-500 dark:from-slate-400 dark:to-zinc-400 bg-clip-text text-transparent">
            403
          </span>
        </div>

        {/* Title and description */}
        <h1 className="mb-3 text-2xl font-bold tracking-tight">{t('forbidden.title')}</h1>
        <p className="mb-8 text-muted-foreground">{t('forbidden.description')}</p>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {isAuthenticated ? (
            <Button variant="default" size="lg" asChild>
              <Link href={`/${locale}/dashboard`}>
                <Home className="mr-2 h-4 w-4" />
                {t('forbidden.goHome')}
              </Link>
            </Button>
          ) : (
            <Button variant="default" size="lg" asChild>
              <Link href={`/${locale}/auth/login`}>
                <LogIn className="mr-2 h-4 w-4" />
                {t('forbidden.signIn')}
              </Link>
            </Button>
          )}
          <Button variant="outline" size="lg" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('forbidden.goBack')}
          </Button>
        </div>

        {/* Help text */}
        <p className="mt-8 text-sm text-muted-foreground">{t('forbidden.helpText')}</p>

        {/* Decorative elements */}
        <div className="mt-8 flex justify-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-1 w-8 rounded-full bg-muted-foreground/30"
              style={{
                opacity: 1 - i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
