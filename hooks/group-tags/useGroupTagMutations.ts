import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { AddGroupTagInput, GroupTag, RemoveGroupTagInput } from '@/graphql/generated/types';

import { evictGroupTagsCache } from './cache';
import { ADD_GROUP_TAG, REMOVE_GROUP_TAG } from './mutations';

export function useGroupTagMutations() {
  const t = useTranslations('groups');

  const update = (cache: ApolloCache<any>) => {
    evictGroupTagsCache(cache);
  };

  const [addGroupTag] = useMutation<{ addGroupTag: GroupTag }>(ADD_GROUP_TAG, {
    update,
  });

  const [removeGroupTag] = useMutation<{ removeGroupTag: GroupTag }>(REMOVE_GROUP_TAG, {
    update,
  });

  const handleAddGroupTag = async (input: AddGroupTagInput) => {
    try {
      const result = await addGroupTag({
        variables: { input },
      });

      toast.success(t('notifications.tagAddedSuccess'));
      return result.data?.addGroupTag;
    } catch (error) {
      console.error('Error adding group tag:', error);
      toast.error(t('notifications.tagAddedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveGroupTag = async (input: RemoveGroupTagInput) => {
    try {
      const result = await removeGroupTag({
        variables: { input },
      });

      toast.success(t('notifications.tagRemovedSuccess'));
      return result.data?.removeGroupTag;
    } catch (error) {
      console.error('Error removing group tag:', error);
      toast.error(t('notifications.tagRemovedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    addGroupTag: handleAddGroupTag,
    removeGroupTag: handleRemoveGroupTag,
  };
}
