'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { AccountType } from '@grantjs/schema';

import { OAuthProviderIcon } from '@/components/common/oauth-provider-icon';
import { Button } from '@/components/ui/button';
import { getApiBaseUrl } from '@/lib/constants';
import type { SocialOAuthProviderId } from '@/lib/oauth-providers';

interface OAuthButtonProps {
  provider: SocialOAuthProviderId;
  label: string;
  className?: string;
  variant?: 'default' | 'outline';
  accountType?: AccountType;
}

export function OAuthButton({
  provider,
  label,
  className,
  variant = 'outline',
  accountType,
}: OAuthButtonProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const redirectParam = searchParams.get('redirect');

  const handleAuth = () => {
    const apiBaseUrl = getApiBaseUrl();
    const urlParams = new URLSearchParams();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    let redirectUrl: string;
    if (redirectParam) {
      if (redirectParam.includes('://')) {
        redirectUrl = redirectParam;
      } else {
        const path = redirectParam.startsWith('/') ? redirectParam : `/${redirectParam}`;
        redirectUrl = `${origin}/${locale}${path}`;
      }
    } else {
      redirectUrl = `${origin}/${locale}/dashboard`;
    }

    urlParams.set('redirect', redirectUrl);
    if (accountType) {
      urlParams.set('accountType', accountType);
    }

    window.location.href = `${apiBaseUrl}/api/auth/${provider}?${urlParams.toString()}`;
  };

  return (
    <Button type="button" variant={variant} className={className} onClick={handleAuth}>
      <OAuthProviderIcon provider={provider} />
      {label}
    </Button>
  );
}
