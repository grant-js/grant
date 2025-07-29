import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Tag } from '@/graphql/generated/types';

import { evictTagsCache } from './cache';
import { CREATE_TAG, UPDATE_TAG, DELETE_TAG } from './mutations';

interface CreateTagInput {
  name: string;
  color: string;
}

interface UpdateTagInput {
  name?: string;
  color?: string;
}

export function useTagMutations() {
  const t = useTranslations('tags');

  const [createTag] = useMutation<{ createTag: Tag }>(CREATE_TAG, {
    update(cache) {
      evictTagsCache(cache);
    },
  });

  const [updateTag] = useMutation<{ updateTag: Tag }>(UPDATE_TAG, {
    update(cache) {
      evictTagsCache(cache);
    },
  });

  const [deleteTag] = useMutation<{ deleteTag: boolean }>(DELETE_TAG, {
    update(cache) {
      evictTagsCache(cache);
      cache.gc();
    },
  });

  const handleCreateTag = async (input: CreateTagInput) => {
    try {
      const result = await createTag({
        variables: { input },
        refetchQueries: ['GetTags'],
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
        refetchQueries: ['GetTags'],
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

  const handleDeleteTag = async (id: string, name: string) => {
    try {
      await deleteTag({
        variables: { id },
        refetchQueries: ['GetTags'],
      });

      toast.success(t('notifications.deleteSuccess', { name }));
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
