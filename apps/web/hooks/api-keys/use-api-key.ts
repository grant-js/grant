import { useMemo } from 'react';
import type { Scope } from '@grantjs/schema';

import { useApiKeys } from './use-api-keys';

/** One key, read through `apiKeys(scope, ids: [id])`. */
export function useApiKey(scope: Scope | null | undefined, apiKeyId: string | undefined) {
  const ids = useMemo(() => (apiKeyId ? [apiKeyId] : []), [apiKeyId]);
  const { apiKeys, loading, error, refetch } = useApiKeys({
    scope: scope!,
    ids,
    page: 1,
    limit: 1,
  });

  return { apiKey: apiKeys[0], loading, error, refetch };
}
