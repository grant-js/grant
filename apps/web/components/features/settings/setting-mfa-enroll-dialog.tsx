'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';

import { MfaOtpInput } from '@/components/features/auth/mfa-otp-input';
import { MfaQrPanel } from '@/components/features/auth/mfa-qr-panel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMfaMutations } from '@/hooks/mfa';
import { refreshSessionViaCookie } from '@/lib/refresh-session';

interface SettingMfaEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => Promise<unknown> | void;
}

export function SettingMfaEnrollDialog({
  open,
  onOpenChange,
  onCompleted,
}: SettingMfaEnrollDialogProps) {
  const t = useTranslations('settings.security.mfa');
  const { createEnrollment, verifyEnrollment } = useMfaMutations();
  const [code, setCode] = useState('');
  const [enrollment, setEnrollment] = useState<{
    factorId: string;
    secret: string;
    otpAuthUrl: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const begin = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await createEnrollment();
      setEnrollment(result);
      if (!result) {
        setError(t('enroll.setupFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('enroll.setupFailed'));
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setError(null);
    setLoading(true);
    try {
      const ok = await verifyEnrollment(code);
      if (ok) {
        await refreshSessionViaCookie();
        await onCompleted();
        onOpenChange(false);
        setEnrollment(null);
        setCode('');
      }
      if (!ok) {
        setError(t('enroll.verifyFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('enroll.verifyFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('enroll.title')}</DialogTitle>
          <DialogDescription>{t('enroll.description')}</DialogDescription>
        </DialogHeader>
        {!enrollment ? (
          <div className="space-y-4">
            <Alert variant="info">
              <Info />
              <AlertTitle>{t('enroll.infoTitle')}</AlertTitle>
              <AlertDescription>{t('enroll.infoDescription')}</AlertDescription>
            </Alert>
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {t('enroll.cancel')}
              </Button>
              <Button onClick={begin} disabled={loading}>
                {loading ? t('enroll.preparing') : t('enroll.continue')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-1">
            <MfaQrPanel secret={enrollment.secret} otpAuthUrl={enrollment.otpAuthUrl} />
            <div className="space-y-2">
              <p className="text-sm font-medium text-center">{t('enroll.totpLabel')}</p>
              <MfaOtpInput
                value={code}
                onChange={setCode}
                disabled={loading}
                containerClassName="justify-center"
              />
            </div>
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {t('enroll.cancel')}
              </Button>
              <Button onClick={verify} disabled={loading || code.length < 6}>
                {loading ? t('enroll.verifying') : t('enroll.verifyAndEnable')}
              </Button>
            </div>
          </div>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
