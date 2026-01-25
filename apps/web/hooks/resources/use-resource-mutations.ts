import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  CreateResourceDocument,
  CreateResourceInput,
  DeleteResourceDocument,
  MutationDeleteResourceArgs,
  Resource,
  UpdateResourceDocument,
  UpdateResourceInput,
} from '@grantjs/schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { evictResourcesCache } from './cache';

export function useResourceMutations() {
  const t = useTranslations('resources');

  const update = (cache: ApolloCache) => {
    evictResourcesCache(cache);
  };

  const [createResource] = useMutation<{ createResource: Resource }>(CreateResourceDocument, {
    update,
  });

  const [updateResource] = useMutation<{ updateResource: Resource }>(UpdateResourceDocument, {
    update,
  });

  const [deleteResource] = useMutation<{ deleteResource: Resource }>(DeleteResourceDocument, {
    update,
  });

  const handleCreateResource = async (input: CreateResourceInput) => {
    try {
      const result = await createResource({
        variables: { input },
      });

      toast.success(t('notifications.createSuccess'));
      return result.data?.createResource;
    } catch (error) {
      console.error('Error creating resource:', error);
      toast.error(t('notifications.createError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleUpdateResource = async (params: { id: string; input: UpdateResourceInput }) => {
    try {
      const result = await updateResource({
        variables: { id: params.id, input: params.input },
      });

      toast.success(t('notifications.updateSuccess'));
      return result.data?.updateResource;
    } catch (error) {
      console.error('Error updating resource:', error);
      toast.error(t('notifications.updateError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleDeleteResource = async (variables: MutationDeleteResourceArgs) => {
    try {
      const result = await deleteResource({
        variables,
      });

      toast.success(t('notifications.deleteSuccess'));
      return result.data?.deleteResource;
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error(t('notifications.deleteError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    createResource: handleCreateResource,
    updateResource: handleUpdateResource,
    deleteResource: handleDeleteResource,
  };
}
