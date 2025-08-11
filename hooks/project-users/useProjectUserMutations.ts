import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  AddProjectUserInput,
  ProjectUser,
  RemoveProjectUserInput,
} from '@/graphql/generated/types';

import { evictProjectUsersCache } from './cache';
import { ADD_PROJECT_USER, REMOVE_PROJECT_USER } from './mutations';

export function useProjectUserMutations() {
  const t = useTranslations('projectUsers');

  const update = (cache: ApolloCache<any>) => {
    evictProjectUsersCache(cache);
  };

  const [addProjectUser] = useMutation<{ addProjectUser: ProjectUser }>(ADD_PROJECT_USER, {
    update,
  });

  const [removeProjectUser] = useMutation<{ removeProjectUser: ProjectUser }>(REMOVE_PROJECT_USER, {
    update,
  });

  const handleAddProjectUser = async (input: AddProjectUserInput) => {
    try {
      const result = await addProjectUser({
        variables: { input },
      });

      toast.success(t('notifications.addSuccess'));
      return result.data?.addProjectUser;
    } catch (error) {
      console.error('Error adding project user:', error);
      toast.error(t('notifications.addError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveProjectUser = async (input: RemoveProjectUserInput) => {
    try {
      const result = await removeProjectUser({
        variables: { input },
      });

      toast.success(t('notifications.removeSuccess'));
      return result.data?.removeProjectUser;
    } catch (error) {
      console.error('Error removing project user:', error);
      toast.error(t('notifications.removeError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    addProjectUser: handleAddProjectUser,
    removeProjectUser: handleRemoveProjectUser,
  };
}
