'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { FeatureDetailLayout, FeatureDetailSkeleton } from '@/components/layout';
import { useApiKey } from '@/hooks/api-keys';
import { useScopeFromParams } from '@/hooks/common';
import { isProjectApiKeyScope } from '@/lib/api-key-grants';
import { useApiKeyStore } from '@/stores/api-key.store';

import { ApiKeyGeneralCard } from './api-key-general-card';
import { ApiKeyScopes } from './api-key-scopes';

export function ApiKeyDetailViewer() {
  const t = useTranslations('user.apiKeys.detail');
  const params = useParams();
  const apiKeyId = params.apiKeyId as string;
  const scope = useScopeFromParams();

  const { apiKey, loading, error, refetch } = useApiKey(scope, apiKeyId);

  // The breadcrumb names the key once it is loaded (name, else client id).
  const setCurrentApiKey = useApiKeyStore((state) => state.setCurrentApiKey);
  const currentKey = apiKey
    ? { id: apiKey.id, name: apiKey.name ?? null, clientId: apiKey.clientId }
    : null;
  useEffect(() => {
    setCurrentApiKey(currentKey);
    // currentKey is rebuilt every render; its fields are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCurrentApiKey, currentKey?.id, currentKey?.name, currentKey?.clientId]);
  useEffect(() => () => setCurrentApiKey(null), [setCurrentApiKey]);

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
