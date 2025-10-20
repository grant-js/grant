'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuthMutations, usePageTitle } from '@/hooks';
import { useAuthStore } from '@/stores/auth.store';

type VerificationStatus = 'verifying' | 'success' | 'error' | 'expired' | 'missing-token';

export default function VerifyEmailPage() {
  const t = useTranslations('auth');
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { verifyEmail } = useAuthMutations();
  const hasVerified = useRef(false);

  usePageTitle('auth.verifyEmail');

  useEffect(() => {
    const handleVerification = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('missing-token');
        return;
      }

      if (hasVerified.current) {
        return;
      }

      hasVerified.current = true;

      try {
        await verifyEmail(token);
        setStatus('success');

        setTimeout(() => {
          if (isAuthenticated()) {
            router.push(`/${locale}/dashboard`);
          } else {
            router.push(`/${locale}/auth/login`);
          }
        }, 3000);
      } catch (error) {
        const apolloError = error as {
          errors?: Array<{ extensions?: { translationKey?: string } }>;
        };
        const graphQLError = apolloError.errors?.[0];
        const translationKey = graphQLError?.extensions?.translationKey;

        if (translationKey === 'errors:auth.tokenExpired') {
          setStatus('expired');
        } else {
          setStatus('error');
          setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
        }
      }
    };

    handleVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, locale]);

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <Alert>
            <Loader2 className="animate-spin" />
            <AlertTitle>{t('verifyEmail.verifying')}</AlertTitle>
            <AlertDescription>{t('verifyEmail.verifyingDescription')}</AlertDescription>
          </Alert>
        );

      case 'success':
        return (
          <div className="space-y-8">
            <Alert variant="success">
              <CheckCircle2 />
              <AlertTitle>{t('verifyEmail.success')}</AlertTitle>
              <AlertDescription>
                {t('verifyEmail.successDescription')}
                <p className="text-xs text-muted-foreground mt-2">{t('verifyEmail.redirecting')}</p>
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'error':
        return (
          <div className="space-y-8">
            <Alert variant="destructive">
              <XCircle />
              <AlertTitle>{t('verifyEmail.error')}</AlertTitle>
              <AlertDescription>
                {errorMessage || t('verifyEmail.errorDescription')}
              </AlertDescription>
            </Alert>
            <div>
              <Link href={`/${locale}/auth/login`}>
                <Button className="w-full" variant="default">
                  {t('verifyEmail.goToLogin')}
                </Button>
              </Link>
            </div>
          </div>
        );

      case 'expired':
        return (
          <div className="space-y-8">
            <Alert variant="warning">
              <AlertTriangle />
              <AlertTitle>{t('verifyEmail.expiredToken')}</AlertTitle>
              <AlertDescription>{t('verifyEmail.expiredTokenDescription')}</AlertDescription>
            </Alert>
            <div>
              <Link href={`/${locale}/auth/login`}>
                <Button className="w-full" variant="default">
                  {t('verifyEmail.goToLogin')}
                </Button>
              </Link>
            </div>
          </div>
        );

      case 'missing-token':
        return (
          <div className="space-y-8">
            <Alert variant="destructive">
              <XCircle />
              <AlertTitle>{t('verifyEmail.missingToken')}</AlertTitle>
              <AlertDescription>{t('verifyEmail.missingTokenDescription')}</AlertDescription>
            </Alert>
            <div>
              <Link href={`/${locale}/auth/login`}>
                <Button className="w-full" variant="default">
                  {t('verifyEmail.goToLogin')}
                </Button>
              </Link>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem-1px)] grid lg:grid-cols-2">
      {/* Left side - Verification content */}
      <div className="flex items-center justify-center p-6 sm:p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{t('verifyEmail.title')}</h1>
            <p className="text-gray-500">{t('verifyEmail.description')}</p>
          </div>
          {renderContent()}
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
