import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { AddRoleTagInput, RemoveRoleTagInput, RoleTag } from '@/graphql/generated/types';

import { evictRoleTagsCache } from './cache';
import { ADD_ROLE_TAG, REMOVE_ROLE_TAG } from './mutations';

export function useRoleTagMutations() {
  const t = useTranslations('roles');

  const update = (cache: ApolloCache<any>) => {
    evictRoleTagsCache(cache);
  };

  const [addRoleTag] = useMutation<{ addRoleTag: RoleTag }>(ADD_ROLE_TAG, {
    update,
  });

  const [removeRoleTag] = useMutation<{ removeRoleTag: RoleTag }>(REMOVE_ROLE_TAG, {
    update,
  });

  const handleAddRoleTag = async (input: AddRoleTagInput) => {
    try {
      const result = await addRoleTag({
        variables: { input },
      });

      toast.success(t('notifications.tagAddedSuccess'));
      return result.data?.addRoleTag;
    } catch (error) {
      console.error('Error adding role tag:', error);
      toast.error(t('notifications.tagAddedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveRoleTag = async (input: RemoveRoleTagInput) => {
    try {
      const result = await removeRoleTag({
        variables: { input },
      });

      toast.success(t('notifications.tagRemovedSuccess'));
      return result.data?.removeRoleTag;
    } catch (error) {
      console.error('Error removing role tag:', error);
      toast.error(t('notifications.tagRemovedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    addRoleTag: handleAddRoleTag,
    removeRoleTag: handleRemoveRoleTag,
  };
}
