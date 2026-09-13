import { useTranslations } from 'next-intl';
import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  ClearProjectAppPictureDocument,
  type ClearProjectAppPictureInput,
  ConfirmProjectAppPictureUploadDocument,
  type ConfirmProjectAppPictureUploadMutation,
  CreateProjectAppDocument,
  type CreateProjectAppInput,
  type CreateProjectAppResult,
  DeleteProjectAppDocument,
  type ProjectApp,
  RequestProjectAppPictureUploadUrlDocument,
  type RequestProjectAppPictureUploadUrlMutation,
  Scope,
  UpdateProjectAppDocument,
  type UpdateProjectAppInput,
} from '@grantjs/schema';
import { toast } from 'sonner';

import { type DirectUploadBody, runDirectUpload } from '@/lib/direct-upload';

import { evictProjectAppsCache } from './cache';

export function useProjectAppMutations() {
  const t = useTranslations('projectApps');

  const update = (cache: ApolloCache) => {
    evictProjectAppsCache(cache);
  };

  const [createProjectApp] = useMutation<{
    createProjectApp: CreateProjectAppResult;
  }>(CreateProjectAppDocument, {
    update,
  });

  const [updateProjectApp] = useMutation<{ updateProjectApp: ProjectApp }>(
    UpdateProjectAppDocument,
    {
      update,
    }
  );

  const [deleteProjectApp] = useMutation<{ deleteProjectApp: boolean }>(DeleteProjectAppDocument, {
    update,
  });

  const [requestProjectAppPictureUploadUrl] =
    useMutation<RequestProjectAppPictureUploadUrlMutation>(
      RequestProjectAppPictureUploadUrlDocument
    );

  const [confirmProjectAppPictureUpload] = useMutation<ConfirmProjectAppPictureUploadMutation>(
    ConfirmProjectAppPictureUploadDocument,
    { update }
  );

  const [clearProjectAppPicture] = useMutation<{ clearProjectAppPicture: ProjectApp }>(
    ClearProjectAppPictureDocument,
    { update }
  );

  const handleCreateProjectApp = async (input: CreateProjectAppInput) => {
    try {
      const result = await createProjectApp({
        variables: { input },
      });

      toast.success(t('notifications.createSuccess'));
      return result.data?.createProjectApp;
    } catch (error) {
      toast.error(t('notifications.createError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleUpdateProjectApp = async (id: string, input: UpdateProjectAppInput) => {
    try {
      const result = await updateProjectApp({
        variables: { id, input },
      });

      toast.success(t('notifications.updateSuccess'));
      return result.data?.updateProjectApp;
    } catch (error) {
      toast.error(t('notifications.updateError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleDeleteProjectApp = async (id: string, scope: Scope) => {
    try {
      await deleteProjectApp({
        variables: { id, scope },
      });

      toast.success(t('notifications.deleteSuccess'));
    } catch (error) {
      toast.error(t('notifications.deleteError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleUploadProjectAppPictureDirect = async (
    target: { projectAppId: string; scope: Scope },
    file: DirectUploadBody,
    options?: { signal?: AbortSignal }
  ) => {
    const result = await runDirectUpload(
      {
        mint: async (descriptor) =>
          (
            await requestProjectAppPictureUploadUrl({
              variables: { input: { ...descriptor, ...target } },
            })
          ).data?.requestProjectAppPictureUploadUrl,
        confirm: async ({ filename }) =>
          (
            await confirmProjectAppPictureUpload({
              variables: { input: { filename, ...target } },
            })
          ).data?.confirmProjectAppPictureUpload,
      },
      file,
      options
    );

    toast.success(t('notifications.uploadPictureSuccess'));
    return result;
  };

  const handleClearProjectAppPicture = async (input: ClearProjectAppPictureInput) => {
    try {
      const result = await clearProjectAppPicture({
        variables: { input },
      });
      toast.success(t('notifications.clearPictureSuccess'));
      return result.data?.clearProjectAppPicture;
    } catch (error) {
      toast.error(t('notifications.clearPictureError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    createProjectApp: handleCreateProjectApp,
    updateProjectApp: handleUpdateProjectApp,
    deleteProjectApp: handleDeleteProjectApp,
    uploadProjectAppPictureDirect: handleUploadProjectAppPictureDirect,
    clearProjectAppPicture: handleClearProjectAppPicture,
  };
}
