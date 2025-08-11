import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  AddProjectGroupInput,
  RemoveProjectGroupInput,
  ProjectGroup,
} from '@/graphql/generated/types';

import { evictProjectGroupCache } from './cache';
import { ADD_PROJECT_GROUP, REMOVE_PROJECT_GROUP } from './mutations';

export function useProjectGroupMutations() {
  const t = useTranslations('projectGroups');
  const update = (cache: ApolloCache<any>) => {
    evictProjectGroupCache(cache);
  };

  const [addProjectGroup] = useMutation<{ addProjectGroup: ProjectGroup }>(ADD_PROJECT_GROUP, {
    update,
  });

  const [removeProjectGroup] = useMutation<{ removeProjectGroup: ProjectGroup }>(
    REMOVE_PROJECT_GROUP,
    {
      update,
    }
  );

  const handleAddProjectGroup = async (input: AddProjectGroupInput) => {
    try {
      const result = await addProjectGroup({
        variables: { input },
      });

      toast.success(t('notifications.addSuccess'));
      return result.data?.addProjectGroup;
    } catch (error) {
      console.error('Error adding project group:', error);
      toast.error(t('notifications.addError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveProjectGroup = async (input: RemoveProjectGroupInput) => {
    try {
      const result = await removeProjectGroup({
        variables: { input },
      });

      toast.success(t('notifications.removeSuccess'));
      return result.data?.removeProjectGroup;
    } catch (error) {
      console.error('Error removing project group:', error);
      toast.error(t('notifications.removeError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    addProjectGroup: handleAddProjectGroup,
    removeProjectGroup: handleRemoveProjectGroup,
  };
}
