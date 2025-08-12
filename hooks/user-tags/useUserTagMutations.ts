import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { AddUserTagInput, RemoveUserTagInput, UserTag } from '@/graphql/generated/types';

import { evictUserTagsCache } from './cache';
import { ADD_USER_TAG, REMOVE_USER_TAG } from './mutations';

export function useUserTagMutations() {
  const t = useTranslations('users');

  const update = (cache: ApolloCache<any>) => {
    evictUserTagsCache(cache);
  };

  const [addUserTag] = useMutation<{ addUserTag: UserTag }>(ADD_USER_TAG, {
    update,
  });

  const [removeUserTag] = useMutation<{ removeUserTag: UserTag }>(REMOVE_USER_TAG, {
    update,
  });

  const handleAddUserTag = async (input: AddUserTagInput) => {
    try {
      const result = await addUserTag({
        variables: { input },
      });

      toast.success(t('notifications.tagAddedSuccess'));
      return result.data?.addUserTag;
    } catch (error) {
      console.error('Error adding user tag:', error);
      toast.error(t('notifications.tagAddedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveUserTag = async (input: RemoveUserTagInput) => {
    try {
      await removeUserTag({
        variables: { input },
      });

      toast.success(t('notifications.tagRemovedSuccess'));
    } catch (error) {
      console.error('Error removing user tag:', error);
      toast.error(t('notifications.tagRemovedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    addUserTag: handleAddUserTag,
    removeUserTag: handleRemoveUserTag,
  };
}
