import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { CreateProjectInput, Project, UpdateProjectInput } from '@/graphql/generated/types';

import { evictProjectsCache } from './cache';
import { CREATE_PROJECT, UPDATE_PROJECT, DELETE_PROJECT } from './mutations';

export function useProjectMutations() {
  const t = useTranslations('projects');

  const update = (cache: ApolloCache<any>) => {
    evictProjectsCache(cache);
  };

  const [createProject] = useMutation<{ createProject: Project }>(CREATE_PROJECT, {
    update,
  });

  const [updateProject] = useMutation<{ updateProject: Project }>(UPDATE_PROJECT, {
    update,
  });

  const [deleteProject] = useMutation<{ deleteProject: Project }>(DELETE_PROJECT, {
    update,
  });

  const handleCreateProject = async (input: CreateProjectInput) => {
    try {
      const result = await createProject({
        variables: { input },
      });

      toast.success(t('notifications.createSuccess'));
      return result.data?.createProject;
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(t('notifications.createError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleUpdateProject = async (id: string, input: UpdateProjectInput) => {
    try {
      const result = await updateProject({
        variables: { id, input },
      });

      toast.success(t('notifications.updateSuccess'));
      return result.data?.updateProject;
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error(t('notifications.updateError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleDeleteProject = async (id: string, _name: string) => {
    try {
      const result = await deleteProject({
        variables: { id },
      });

      toast.success(t('notifications.deleteSuccess'));
      return result.data?.deleteProject;
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error(t('notifications.deleteError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    createProject: handleCreateProject,
    updateProject: handleUpdateProject,
    deleteProject: handleDeleteProject,
  };
}
