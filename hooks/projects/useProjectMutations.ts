import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  AddProjectRoleInput,
  AddProjectTagInput,
  CreateProjectInput,
  Project,
  ProjectRole,
  ProjectTag,
  RemoveProjectRoleInput,
  RemoveProjectTagInput,
  UpdateProjectInput,
} from '@/graphql/generated/types';

import { evictProjectsCache } from './cache';
import {
  CREATE_PROJECT,
  UPDATE_PROJECT,
  DELETE_PROJECT,
  ADD_PROJECT_ROLE,
  REMOVE_PROJECT_ROLE,
  ADD_PROJECT_TAG,
  REMOVE_PROJECT_TAG,
} from './mutations';

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

  const [addProjectRole] = useMutation<{ addProjectRole: ProjectRole }>(ADD_PROJECT_ROLE, {
    update,
  });

  const [removeProjectRole] = useMutation<{ removeProjectRole: ProjectRole }>(REMOVE_PROJECT_ROLE, {
    update,
  });

  const [addProjectTag] = useMutation<{ addProjectTag: ProjectTag }>(ADD_PROJECT_TAG, {
    update,
  });

  const [removeProjectTag] = useMutation<{ removeProjectTag: ProjectTag }>(REMOVE_PROJECT_TAG, {
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

  const handleDeleteProject = async (id: string, name: string) => {
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

  const handleAddProjectTag = async (input: AddProjectTagInput) => {
    try {
      const result = await addProjectTag({
        variables: { input },
      });

      return result.data?.addProjectTag;
    } catch (error) {
      console.error('Error adding project tag:', error);
      throw error;
    }
  };

  const handleRemoveProjectRole = async (input: RemoveProjectRoleInput) => {
    try {
      const result = await removeProjectRole({
        variables: { input },
      });

      return result.data?.removeProjectRole;
    } catch (error) {
      console.error('Error removing project role:', error);
      throw error;
    }
  };

  const handleAddProjectRole = async (input: AddProjectRoleInput) => {
    try {
      const result = await addProjectRole({
        variables: { input },
      });

      return result.data?.addProjectRole;
    } catch (error) {
      console.error('Error adding project role:', error);
      throw error;
    }
  };

  const handleRemoveProjectTag = async (input: RemoveProjectTagInput) => {
    try {
      const result = await removeProjectTag({
        variables: { input },
      });

      return result.data?.removeProjectTag;
    } catch (error) {
      console.error('Error removing project tag:', error);
      throw error;
    }
  };

  return {
    createProject: handleCreateProject,
    updateProject: handleUpdateProject,
    deleteProject: handleDeleteProject,
    addProjectRole: handleAddProjectRole,
    removeProjectRole: handleRemoveProjectRole,
    addProjectTag: handleAddProjectTag,
    removeProjectTag: handleRemoveProjectTag,
  };
}
