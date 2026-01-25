'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AuthLayout } from '@/components/layout';
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
    <AuthLayout title={t('verifyEmail.title')} description={t('verifyEmail.description')}>
      {renderContent()}
    </AuthLayout>
  );
}
