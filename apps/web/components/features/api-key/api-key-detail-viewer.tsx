'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { FeatureDetailLayout, FeatureDetailSkeleton } from '@/components/layout';
import { useApiKey } from '@/hooks/api-keys';
import { useScopeFromParams } from '@/hooks/common';
import { isProjectApiKeyScope } from '@/lib/api-key-grants';

import { ApiKeyGeneralCard } from './api-key-general-card';
import { ApiKeyScopes } from './api-key-scopes';

export function ApiKeyDetailViewer() {
  const t = useTranslations('user.apiKeys.detail');
  const params = useParams();
  const apiKeyId = params.apiKeyId as string;
  const scope = useScopeFromParams();

  const { apiKey, loading, error, refetch } = useApiKey(scope, apiKeyId);

  if (loading && !apiKey) {
    return (
      <FeatureDetailSkeleton
        cards={[
          { showFooter: false, rows: 6 },
          { variant: 'table', rows: 4, showToolbar: true },
          { variant: 'table', rows: 4, showToolbar: true },
        ]}
      />
    );
  }

  if (error || !apiKey || !isProjectApiKeyScope(scope)) {
    return <div>{t('error')}</div>;
  }

  return (
    <FeatureDetailLayout>
      <ApiKeyGeneralCard apiKey={apiKey} />
      <ApiKeyScopes apiKey={apiKey} onAfterChange={refetch} />
    </FeatureDetailLayout>
  );
}
