'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AccountType } from '@grantjs/schema';

import { OAuthButton } from '@/components/common/oauth-button';
import { getSocialOAuthProviders, type SocialOAuthProvider } from '@/lib/oauth-providers';

interface OAuthProviderButtonsProps {
  className?: string;
  accountType?: AccountType;
  mode?: 'signIn' | 'signUp';
}

export function OAuthProviderButtons({
  className,
  accountType,
  mode = 'signIn',
}: OAuthProviderButtonsProps) {
  const t = useTranslations('auth');
  const [providers, setProviders] = useState<SocialOAuthProvider[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSocialOAuthProviders()
      .then((list) => {
        if (!cancelled) setProviders(list);
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!providers || providers.length === 0) {
    return null;
  }

  const heading = mode === 'signUp' ? t('oauth.signUpWith') : t('oauth.signInWith');
  const labelKey = mode === 'signUp' ? 'signUp' : 'signIn';

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{heading}</span>
        </div>
      </div>
      <div className="grid gap-6">
        {providers.map((provider) => (
          <OAuthButton
            key={provider.id}
            provider={provider.id}
            label={t(`${provider.id}.${labelKey}`)}
            className={className}
            accountType={accountType}
          />
        ))}
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('oauth.or')}</span>
        </div>
      </div>
    </div>
  );
}
