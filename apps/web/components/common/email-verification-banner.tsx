'use client';

import { useEffect, useState } from 'react';

import { AlertTriangle, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useAuthMutations } from '@/hooks';

interface EmailVerificationBannerProps {
  email?: string;
  expiresAt?: Date | null;
}

export function EmailVerificationBanner({ email, expiresAt }: EmailVerificationBannerProps) {
  const t = useTranslations('auth');
  const [isVisible, setIsVisible] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const { resendVerification } = useAuthMutations();

  useEffect(() => {
    if (expiresAt) {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry.getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      setDaysRemaining(days);
    }
  }, [expiresAt]);

  const handleResend = async () => {
    if (!email) return;

    setIsSending(true);
    try {
      await resendVerification(email);
    } catch (error) {
      console.error('Resend verification error:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="sticky top-[3.5rem] z-40 bg-amber-50/95 dark:bg-amber-950/80 backdrop-blur-sm border-b border-amber-200 dark:border-amber-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {daysRemaining > 0
                ? t('notifications.verificationWarning', { days: daysRemaining })
                : t('notifications.verificationExpired')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleResend}
              disabled={isSending}
              variant="outline"
              size="sm"
              className="h-8 bg-white dark:bg-amber-950 hover:bg-amber-100 dark:hover:bg-amber-900/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
            >
              {isSending ? 'Sending...' : 'Resend Email'}
            </Button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-amber-600 dark:text-amber-500 hover:text-amber-800 dark:hover:text-amber-400 p-1"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
