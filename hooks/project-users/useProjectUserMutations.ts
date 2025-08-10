import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { ProjectUser } from '@/graphql/generated/types';

import { ADD_PROJECT_USER, REMOVE_PROJECT_USER } from './mutations';

interface AddProjectUserInput {
  projectId: string;
  userId: string;
}

interface RemoveProjectUserInput {
  projectId: string;
  userId: string;
}

export function useProjectUserMutations() {
  const t = useTranslations('projectUsers');

  const [addProjectUser] = useMutation<{ addProjectUser: ProjectUser }>(ADD_PROJECT_USER, {
    update(cache) {
      // Only evict project users cache, not the entire users cache
      cache.evict({ fieldName: 'projectUsers' });
      cache.gc();
    },
  });

  const [removeProjectUser] = useMutation<{ removeProjectUser: ProjectUser }>(REMOVE_PROJECT_USER, {
    // Remove cache eviction since it's handled manually in DeleteUserDialog
  });

  const handleAddProjectUser = async (input: AddProjectUserInput) => {
    try {
      const result = await addProjectUser({
        variables: { input },
        // Remove refetchQueries since cache eviction is handled manually
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
        // Remove refetchQueries since cache eviction is handled manually in DeleteUserDialog
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
