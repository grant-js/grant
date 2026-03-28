'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { AccountType } from '@grantjs/schema';
import { GitBranch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getApiBaseUrl } from '@/lib/constants';

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
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;

  const redirectParam = searchParams.get('redirect');

  const handleGithubAuth = () => {
    const apiBaseUrl = getApiBaseUrl();
    const urlParams = new URLSearchParams();

    let redirectUrl: string;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

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

    const githubAuthUrl = `${apiBaseUrl}/api/auth/github?${urlParams.toString()}`;
    window.location.href = githubAuthUrl;
  };

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={handleGithubAuth}
      disabled={false}
    >
      <GitBranch className="size-4" />
      Github
    </Button>
  );
}
