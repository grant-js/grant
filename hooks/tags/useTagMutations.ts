import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { CreateTagInput, Tag, TagPage, UpdateTagInput } from '@/graphql/generated/types';

import { evictTagsCache } from './cache';
import { CREATE_TAG, UPDATE_TAG, DELETE_TAG } from './mutations';

export function useTagMutations() {
  const t = useTranslations('tags');

  const update = (cache: ApolloCache<any>) => {
    evictTagsCache(cache);
  };

  const [createTag] = useMutation<{ createTag: TagPage }>(CREATE_TAG, {
    update,
  });

  const [updateTag] = useMutation<{ updateTag: Tag }>(UPDATE_TAG, {
    update,
  });

  const [deleteTag] = useMutation<{ deleteTag: Tag }>(DELETE_TAG, {
    update,
  });

  const handleCreateTag = async (input: CreateTagInput) => {
    try {
      const result = await createTag({
        variables: { input },
      });

      toast.success(t('notifications.createSuccess'));
      return result.data?.createTag;
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error(t('notifications.createError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleUpdateTag = async (id: string, input: UpdateTagInput) => {
    try {
      const result = await updateTag({
        variables: { id, input },
      });

      toast.success(t('notifications.updateSuccess'));
      return result.data?.updateTag;
    } catch (error) {
      console.error('Error updating tag:', error);
      toast.error(t('notifications.updateError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleDeleteTag = async (id: string, _name: string) => {
    try {
      const result = await deleteTag({
        variables: { id },
      });

      toast.success(t('notifications.deleteSuccess'));
      return result.data?.deleteTag;
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error(t('notifications.deleteError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    handleCreateTag,
    handleUpdateTag,
    handleDeleteTag,
  };
}
