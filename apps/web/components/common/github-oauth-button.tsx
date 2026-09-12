'use client';

import { useTranslations } from 'next-intl';
import { AccountType } from '@grantjs/schema';

import { OAuthButton } from '@/components/common/oauth-button';

interface GithubOAuthButtonProps {
  className?: string;
  variant?: 'default' | 'outline';
  accountType?: AccountType;
}

export function GithubOAuthButton({
  className,
  variant = 'outline',
  accountType,
}: GithubOAuthButtonProps) {
  const t = useTranslations('auth.github');
  return (
    <OAuthButton
      provider="github"
      label={t('signIn')}
      className={className}
      variant={variant}
      accountType={accountType}
    />
  );
}
