import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  AddPermissionTagInput,
  PermissionTag,
  RemovePermissionTagInput,
} from '@/graphql/generated/types';

import { evictPermissionTagsCache } from './cache';
import { ADD_PERMISSION_TAG, REMOVE_PERMISSION_TAG } from './mutations';

export function usePermissionTagMutations() {
  const t = useTranslations('permissions');

  const update = (cache: ApolloCache<any>) => {
    evictPermissionTagsCache(cache);
  };

  const [addPermissionTag] = useMutation<{ addPermissionTag: PermissionTag }>(ADD_PERMISSION_TAG, {
    update,
  });

  const [removePermissionTag] = useMutation<{ removePermissionTag: PermissionTag }>(
    REMOVE_PERMISSION_TAG,
    {
      update,
    }
  );

  const handleAddPermissionTag = async (input: AddPermissionTagInput) => {
    try {
      const result = await addPermissionTag({
        variables: { input },
      });

      toast.success(t('notifications.tagAddedSuccess'));
      return result.data?.addPermissionTag;
    } catch (error) {
      console.error('Error adding permission tag:', error);
      toast.error(t('notifications.tagAddedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemovePermissionTag = async (input: RemovePermissionTagInput) => {
    try {
      const result = await removePermissionTag({
        variables: { input },
      });

      toast.success(t('notifications.tagRemovedSuccess'));
      return result.data?.removePermissionTag;
    } catch (error) {
      console.error('Error removing permission tag:', error);
      toast.error(t('notifications.tagRemovedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    addPermissionTag: handleAddPermissionTag,
    removePermissionTag: handleRemovePermissionTag,
  };
}
