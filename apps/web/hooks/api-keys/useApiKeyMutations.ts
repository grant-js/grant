import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  ApiKey,
  CreateApiKeyDocument,
  CreateApiKeyInput,
  CreateApiKeyResult,
  DeleteApiKeyDocument,
  DeleteApiKeyInput,
  ExchangeApiKeyDocument,
  ExchangeApiKeyInput,
  ExchangeApiKeyResult,
  RevokeApiKeyDocument,
  RevokeApiKeyInput,
} from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { evictApiKeysCache } from './cache';

export function useApiKeyMutations() {
  const t = useTranslations('apiKeys');

  const update = (cache: ApolloCache) => {
    evictApiKeysCache(cache);
  };

  const [createApiKey] = useMutation<{ createApiKey: CreateApiKeyResult }>(CreateApiKeyDocument, {
    update,
  });

  const [deleteApiKey] = useMutation<{ deleteApiKey: ApiKey }>(DeleteApiKeyDocument, {
    update,
  });

  const [revokeApiKey] = useMutation<{ revokeApiKey: ApiKey }>(RevokeApiKeyDocument, {
    update,
  });

  const [exchangeApiKey] = useMutation<{ exchangeApiKey: ExchangeApiKeyResult }>(
    ExchangeApiKeyDocument
  );

  const handleCreateApiKey = async (input: CreateApiKeyInput) => {
    try {
      const result = await createApiKey({
        variables: { input },
      });

      toast.success(t('notifications.createSuccess'));
      return result.data?.createApiKey;
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error(t('notifications.createError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleDeleteApiKey = async (input: DeleteApiKeyInput) => {
    try {
      const result = await deleteApiKey({
        variables: { input },
      });

      toast.success(t('notifications.deleteSuccess'));
      return result.data?.deleteApiKey;
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error(t('notifications.deleteError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRevokeApiKey = async (input: RevokeApiKeyInput) => {
    try {
      const result = await revokeApiKey({
        variables: { input },
      });

      toast.success(t('notifications.revokeSuccess'));
      return result.data?.revokeApiKey;
    } catch (error) {
      console.error('Error revoking API key:', error);
      toast.error(t('notifications.revokeError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleExchangeApiKey = async (input: ExchangeApiKeyInput) => {
    try {
      const result = await exchangeApiKey({
        variables: { input },
      });

      return result.data?.exchangeApiKey;
    } catch (error) {
      console.error('Error exchanging API key:', error);
      toast.error(t('notifications.exchangeError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    createApiKey: handleCreateApiKey,
    deleteApiKey: handleDeleteApiKey,
    revokeApiKey: handleRevokeApiKey,
    exchangeApiKey: handleExchangeApiKey,
  };
}
