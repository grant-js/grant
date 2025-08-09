import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  AddOrganizationProjectInput,
  RemoveOrganizationProjectInput,
  OrganizationProject,
} from '@/graphql/generated/types';

import { evictOrganizationProjectsCache } from './cache';
import { ADD_ORGANIZATION_PROJECT, REMOVE_ORGANIZATION_PROJECT } from './mutations';

export function useOrganizationProjectMutations() {
  const t = useTranslations('organizationProjects');

  const [addOrganizationProject] = useMutation<{ addOrganizationProject: OrganizationProject }>(
    ADD_ORGANIZATION_PROJECT,
    {
      update(cache) {
        evictOrganizationProjectsCache(cache);
      },
    }
  );

  const [removeOrganizationProject] = useMutation<{
    removeOrganizationProject: OrganizationProject;
  }>(REMOVE_ORGANIZATION_PROJECT, {
    update(cache) {
      evictOrganizationProjectsCache(cache);
    },
  });

  const handleAddOrganizationProject = async (input: AddOrganizationProjectInput) => {
    try {
      const result = await addOrganizationProject({
        variables: { input },
        refetchQueries: ['GetProjects', 'GetOrganizationProjects'],
      });

      toast.success(t('notifications.addSuccess'));
      return result.data?.addOrganizationProject;
    } catch (error) {
      console.error('Error adding organization project:', error);
      toast.error(t('notifications.addError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveOrganizationProject = async (input: RemoveOrganizationProjectInput) => {
    try {
      const result = await removeOrganizationProject({
        variables: { input },
        refetchQueries: ['GetProjects', 'GetOrganizationProjects'],
      });

      toast.success(t('notifications.removeSuccess'));
      return result.data?.removeOrganizationProject;
    } catch (error) {
      console.error('Error removing organization project:', error);
      toast.error(t('notifications.removeError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    addOrganizationProject: handleAddOrganizationProject,
    removeOrganizationProject: handleRemoveOrganizationProject,
  };
}
