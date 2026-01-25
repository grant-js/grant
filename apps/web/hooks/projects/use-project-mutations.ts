import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { CreateProjectInput, Project, Scope, UpdateProjectInput } from '@grantjs/schema';
import {
  CreateProjectDocument,
  UpdateProjectDocument,
  DeleteProjectDocument,
} from '@grantjs/schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { evictProjectsCache } from './cache';

export function useProjectMutations() {
  const t = useTranslations('projects');

  const update = (cache: ApolloCache) => {
    evictProjectsCache(cache);
  };

  const [createProject] = useMutation<{ createProject: Project }>(CreateProjectDocument, {
    update,
  });

  const [updateProject] = useMutation<{ updateProject: Project }>(UpdateProjectDocument, {
    update,
  });

  const [deleteProject] = useMutation<{ deleteProject: Project }>(DeleteProjectDocument, {
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

  const handleDeleteProject = async (id: string, scope: Scope) => {
    try {
      const result = await deleteProject({
        variables: { id, scope },
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
