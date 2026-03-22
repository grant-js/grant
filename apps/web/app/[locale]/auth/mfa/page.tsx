'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation } from '@apollo/client/react';
import {
  SetupMfaDocument,
  VerifyMfaDocument,
  VerifyMfaRecoveryCodeDocument,
} from '@grantjs/schema';

import { MfaOtpInput } from '@/components/features/auth/mfa-otp-input';
import { MfaQrPanel } from '@/components/features/auth/mfa-qr-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from '@/i18n/navigation';
import { getAuthRedirectUrl } from '@/lib/redirect';
import { useAuthStore } from '@/stores/auth.store';

export default function MfaPage() {
  const t = useTranslations('settings.security.mfa');
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = useMemo(() => searchParams.get('mode') ?? 'challenge', [searchParams]);
  const returnTo = useMemo(() => searchParams.get('returnTo') ?? '/dashboard', [searchParams]);
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setAccessToken, setMfaVerified } = useAuthStore();
  const [setupMfa, { loading: settingUp }] = useMutation(SetupMfaDocument);
  const [verifyMfa, { loading: verifying }] = useMutation(VerifyMfaDocument);
  const [verifyRecoveryCode, { loading: verifyingRecovery }] = useMutation(
    VerifyMfaRecoveryCodeDocument
  );

  const handleSetup = async () => {
    setError(null);
    try {
      const result = await setupMfa();
      setSetupSecret(result.data?.setupMfa?.secret ?? null);
      setSetupUrl(result.data?.setupMfa?.otpAuthUrl ?? null);
      if (!result.data?.setupMfa) {
        setError(t('enroll.setupFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('enroll.setupFailed'));
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await verifyMfa({ variables: { input: { code } } });
      const accessToken = result.data?.verifyMfa?.accessToken;
      if (accessToken) {
        setAccessToken(accessToken);
      }
      setMfaVerified(true);
      router.push(getAuthRedirectUrl() ?? returnTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('challenge.invalidCode'));
    }
  };

  const handleVerifyRecoveryCode = async () => {
    setError(null);
    try {
      const result = await verifyRecoveryCode({ variables: { input: { code: recoveryCode } } });
      const data = result.data?.verifyMfaRecoveryCode;
      if (data?.accessToken) {
        setAccessToken(data.accessToken);
      }
      setMfaVerified(true);
      router.push(getAuthRedirectUrl() ?? returnTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('challenge.invalidRecoveryCode'));
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4 py-12">
      <h1 className="text-2xl font-semibold">{t('challenge.title')}</h1>
      <p className="text-sm text-muted-foreground">
        {mode === 'enroll' ? t('enroll.description') : t('challenge.description')}
      </p>

      {mode === 'enroll' && !setupSecret && (
        <Button onClick={handleSetup} disabled={settingUp}>
          {settingUp ? t('enroll.preparing') : t('enroll.generateSetup')}
        </Button>
      )}

      {setupSecret && setupUrl ? <MfaQrPanel secret={setupSecret} otpAuthUrl={setupUrl} /> : null}

      <form className="space-y-4" onSubmit={handleVerify}>
        <div className="space-y-2">
          <Label htmlFor="mfa-challenge-totp">{t('enroll.totpLabel')}</Label>
          <MfaOtpInput
            id="mfa-challenge-totp"
            value={code}
            onChange={setCode}
            disabled={verifying}
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={verifying || code.length < 6}
        >
          {verifying ? t('enroll.verifying') : t('challenge.verifyCode')}
        </Button>
      </form>

      {showRecoveryForm ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t('challenge.useRecoveryCode')}</p>
          <div className="flex gap-2">
            <Input
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder={t('challenge.recoveryCodePlaceholder')}
            />
            <Button
              variant="outline"
              disabled={verifyingRecovery || recoveryCode.trim().length < 8}
              onClick={handleVerifyRecoveryCode}
            >
              {verifyingRecovery ? t('challenge.checking') : t('challenge.useCode')}
            </Button>
          </div>
          <div>
            <button
              type="button"
              onClick={() => {
                setShowRecoveryForm(false);
                setRecoveryCode('');
              }}
              className="text-sm text-primary hover:text-primary/80"
            >
              {t('challenge.backToAuthenticator')}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          {t('challenge.recoveryPrompt')}{' '}
          <button
            type="button"
            onClick={() => setShowRecoveryForm(true)}
            className="text-primary hover:text-primary/80"
          >
            {t('challenge.recoveryLink')}
          </button>
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
