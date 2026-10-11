'use client';

import { useTranslations } from 'next-intl';

import { CopyToClipboard, FeatureModuleCard } from '@/components/common';
import type { ProjectOAuthTokenSnapshot } from '@/lib/project-oauth-pkce.lib';

interface ProjectAppTestTokensCardProps {
  tokens: ProjectOAuthTokenSnapshot | null;
  error: string | null;
  waiting: boolean;
}

function TokenRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <CopyToClipboard text={value} size="sm" variant="ghost" className="shrink-0" />
      </div>
      <p className="break-all font-mono text-xs text-muted-foreground">{value}</p>
    </div>
  );
}

export function ProjectAppTestTokensCard({
  tokens,
  error,
  waiting,
}: ProjectAppTestTokensCardProps) {
  const t = useTranslations('projectApp.test.tokens');

  return (
    <FeatureModuleCard title={t('title')} description={t('description')} collapsible>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!error && waiting && !tokens ? (
        <p className="text-sm text-muted-foreground">{t('waiting')}</p>
      ) : null}
      {tokens ? (
        <div className="space-y-4">
          <TokenRow label={t('accessToken')} value={tokens.accessToken} />
          <TokenRow label={t('refreshToken')} value={tokens.refreshToken} />
          <p className="text-sm text-muted-foreground">
            {t('expiresIn', { seconds: tokens.expiresIn })}
          </p>
          {tokens.scope ? (
            <p className="text-sm text-muted-foreground">
              {t('scope')}: {tokens.scope}
            </p>
          ) : null}
        </div>
      ) : null}
    </FeatureModuleCard>
  );
}
