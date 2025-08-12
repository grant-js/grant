import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { AddProjectTagInput, ProjectTag, RemoveProjectTagInput } from '@/graphql/generated/types';

import { evictProjectTagsCache } from './cache';
import { ADD_PROJECT_TAG, REMOVE_PROJECT_TAG } from './mutations';

export function useProjectTagMutations() {
  const t = useTranslations('projects');

  const [addProjectTag] = useMutation<{ addProjectTag: ProjectTag }>(ADD_PROJECT_TAG, {
    update(cache) {
      evictProjectTagsCache(cache);
    },
  });

  const [removeProjectTag] = useMutation<{ removeProjectTag: ProjectTag }>(REMOVE_PROJECT_TAG, {
    update(cache) {
      evictProjectTagsCache(cache);
    },
  });

  const handleAddProjectTag = async (input: AddProjectTagInput) => {
    try {
      const result = await addProjectTag({
        variables: { input },
        refetchQueries: ['GetProjects'],
      });

      toast.success(t('notifications.tagAddedSuccess'));
      return result.data?.addProjectTag;
    } catch (error) {
      console.error('Error adding project tag:', error);
      toast.error(t('notifications.tagAddedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveProjectTag = async (input: RemoveProjectTagInput) => {
    try {
      const result = await removeProjectTag({
        variables: { input },
        refetchQueries: ['GetProjects'],
      });

      toast.success(t('notifications.tagRemovedSuccess'));
      return result.data?.removeProjectTag;
    } catch (error) {
      console.error('Error removing project tag:', error);
      toast.error(t('notifications.tagRemovedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    addProjectTag: handleAddProjectTag,
    removeProjectTag: handleRemoveProjectTag,
  };
}
