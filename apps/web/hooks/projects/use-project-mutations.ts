import { useTranslations } from 'next-intl';
import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  ClearProjectPictureDocument,
  ClearProjectPictureInput,
  ConfirmProjectPictureUploadDocument,
  ConfirmProjectPictureUploadMutation,
  CreateProjectDocument,
  CreateProjectInput,
  DeleteProjectDocument,
  Project,
  RequestProjectPictureUploadUrlDocument,
  RequestProjectPictureUploadUrlMutation,
  Scope,
  UpdateProjectDocument,
  UpdateProjectInput,
} from '@grantjs/schema';
import { toast } from 'sonner';

import { type DirectUploadBody, runDirectUpload } from '@/lib/direct-upload';

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

  const [requestProjectPictureUploadUrl] = useMutation<RequestProjectPictureUploadUrlMutation>(
    RequestProjectPictureUploadUrlDocument
  );

  const [confirmProjectPictureUpload] = useMutation<ConfirmProjectPictureUploadMutation>(
    ConfirmProjectPictureUploadDocument,
    { update }
  );

  const [clearProjectPicture] = useMutation<{ clearProjectPicture: Project }>(
    ClearProjectPictureDocument,
    { update }
  );

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

  const handleUploadProjectPictureDirect = async (
    target: { projectId: string; scope: Scope },
    file: DirectUploadBody,
    options?: { signal?: AbortSignal }
  ) => {
    const result = await runDirectUpload(
      {
        mint: async (descriptor) =>
          (
            await requestProjectPictureUploadUrl({
              variables: { input: { ...descriptor, ...target } },
            })
          ).data?.requestProjectPictureUploadUrl,
        confirm: async ({ filename }) =>
          (
            await confirmProjectPictureUpload({
              variables: { input: { filename, ...target } },
            })
          ).data?.confirmProjectPictureUpload,
      },
      file,
      options
    );

    toast.success(t('notifications.uploadPictureSuccess'));
    return result;
  };

  const handleClearProjectPicture = async (input: ClearProjectPictureInput) => {
    try {
      const result = await clearProjectPicture({
        variables: { input },
      });
      toast.success(t('notifications.clearPictureSuccess'));
      return result.data?.clearProjectPicture;
    } catch (error) {
      toast.error(t('notifications.clearPictureError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    createProject: handleCreateProject,
    updateProject: handleUpdateProject,
    deleteProject: handleDeleteProject,
    uploadProjectPictureDirect: handleUploadProjectPictureDirect,
    clearProjectPicture: handleClearProjectPicture,
  };
}
