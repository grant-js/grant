import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  type ApiKeyAttachableGrants,
  GetApiKeyAttachableGrantsDocument,
  type Scope,
} from '@grantjs/schema';

import { isProjectApiKeyScope, toApiKeyCohort } from '@/lib/api-key-grants';

interface UseApiKeyAttachableGrantsOptions {
  enabled?: boolean;
}

/** What the caller may give a project key in this scope: attachable permissions and standard roles. */
export function useApiKeyAttachableGrants(
  scope: Scope | null | undefined,
  options: UseApiKeyAttachableGrantsOptions = {}
) {
  const { enabled = true } = options;
  const skip = !enabled || !isProjectApiKeyScope(scope);

  const { data, loading, error, refetch } = useQuery<{
    apiKeyAttachableGrants: ApiKeyAttachableGrants;
  }>(GetApiKeyAttachableGrantsDocument, {
    variables: { scope: scope! },
    skip,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const grants = data?.apiKeyAttachableGrants;

  return useMemo(
    () => ({
      permissions: grants?.permissions ?? [],
      roles: grants?.roles ?? [],
      cohort: toApiKeyCohort(grants),
      loading,
      error,
      refetch,
    }),
    [grants, loading, error, refetch]
  );
}
