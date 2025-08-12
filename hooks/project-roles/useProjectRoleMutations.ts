import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  AddProjectRoleInput,
  ProjectRole,
  RemoveProjectRoleInput,
} from '@/graphql/generated/types';

import { evictProjectRolesCache } from './cache';
import { ADD_PROJECT_ROLE, REMOVE_PROJECT_ROLE } from './mutations';

export function useProjectRoleMutations() {
  const t = useTranslations('projects');

  const [addProjectRole] = useMutation<{ addProjectRole: ProjectRole }>(ADD_PROJECT_ROLE, {
    update(cache) {
      evictProjectRolesCache(cache);
    },
  });

  const [removeProjectRole] = useMutation<{ removeProjectRole: ProjectRole }>(REMOVE_PROJECT_ROLE, {
    update(cache) {
      evictProjectRolesCache(cache);
    },
  });

  const handleAddProjectRole = async (input: AddProjectRoleInput) => {
    try {
      const result = await addProjectRole({
        variables: { input },
        refetchQueries: ['GetProjects'],
      });

      toast.success(t('notifications.roleAddedSuccess'));
      return result.data?.addProjectRole;
    } catch (error) {
      console.error('Error adding project role:', error);
      toast.error(t('notifications.roleAddedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveProjectRole = async (input: RemoveProjectRoleInput) => {
    try {
      const result = await removeProjectRole({
        variables: { input },
        refetchQueries: ['GetProjects'],
      });

      toast.success(t('notifications.roleRemovedSuccess'));
      return result.data?.removeProjectRole;
    } catch (error) {
      console.error('Error removing project role:', error);
      toast.error(t('notifications.roleRemovedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    addProjectRole: handleAddProjectRole,
    removeProjectRole: handleRemoveProjectRole,
  };
}
