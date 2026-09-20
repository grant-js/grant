import { useTranslations } from 'next-intl';
import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  ClearProjectOAuthConnectionDocument,
  ProjectOAuthConnection,
  ProjectOAuthConnectionProvider,
  Scope,
  UpsertProjectOAuthConnectionDocument,
} from '@grantjs/schema';
import { toast } from 'sonner';

import { evictProjectOAuthConnectionsCache } from './cache';

function updateCache(cache: ApolloCache): void {
  evictProjectOAuthConnectionsCache(cache);
}

export function useProjectOAuthConnectionMutations() {
  const t = useTranslations('projects.oauthConnections');

  const [upsertMutation] = useMutation<{ upsertProjectOAuthConnection: ProjectOAuthConnection }>(
    UpsertProjectOAuthConnectionDocument,
    { update: updateCache }
  );

  const [clearMutation] = useMutation<{ clearProjectOAuthConnection: boolean }>(
    ClearProjectOAuthConnectionDocument,
    { update: updateCache }
  );

  const upsertProjectOAuthConnection = async (input: {
    scope: Scope;
    provider: ProjectOAuthConnectionProvider;
    clientId: string;
    clientSecret: string;
  }) => {
    try {
      const result = await upsertMutation({ variables: { input } });
      toast.success(t('notifications.saveSuccess', { provider: t(`providers.${input.provider}`) }));
      return result.data?.upsertProjectOAuthConnection;
    } catch (error) {
      toast.error(t('notifications.saveError'), {
        description: error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  };

  const clearProjectOAuthConnection = async (input: {
    scope: Scope;
    provider: ProjectOAuthConnectionProvider;
  }) => {
    try {
      await clearMutation({ variables: { input } });
      toast.success(t('notifications.clearSuccess', { provider: t(`providers.${input.provider}`) }));
    } catch (error) {
      toast.error(t('notifications.clearError'), {
        description: error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  };

  return {
    upsertProjectOAuthConnection,
    clearProjectOAuthConnection,
  };
}
