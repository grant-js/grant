import { useTranslations } from 'next-intl';
import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  ConfirmUserPictureUploadDocument,
  ConfirmUserPictureUploadMutation,
  CreateUserDocument,
  CreateUserInput,
  DeleteUserDocument,
  MutationDeleteUserArgs,
  RequestUserPictureUploadUrlDocument,
  RequestUserPictureUploadUrlMutation,
  Scope,
  UpdateUserDocument,
  UpdateUserInput,
  UploadUserPictureDocument,
  UploadUserPictureInput,
  UploadUserPictureResult,
  User,
} from '@grantjs/schema';
import { toast } from 'sonner';

import { type DirectUploadBody, runDirectUpload } from '@/lib/direct-upload';

import { evictUsersCache } from './cache';

export function useUserMutations() {
  const t = useTranslations('users');

  const update = (cache: ApolloCache) => {
    evictUsersCache(cache);
  };

  const [createUser] = useMutation<{ createUser: User }>(CreateUserDocument, {
    update,
  });

  const [updateUser] = useMutation<{ updateUser: User }>(UpdateUserDocument, {
    update,
  });

  const [deleteUser] = useMutation<{ deleteUser: User }>(DeleteUserDocument, {
    update,
  });

  const [uploadUserPicture] = useMutation<{ uploadUserPicture: UploadUserPictureResult }>(
    UploadUserPictureDocument,
    {
      update,
    }
  );

  // Minting changes nothing, so it carries no cache update; the confirm is what makes
  // the new picture the current one.
  const [requestUserPictureUploadUrl] = useMutation<RequestUserPictureUploadUrlMutation>(
    RequestUserPictureUploadUrlDocument
  );

  const [confirmUserPictureUpload] = useMutation<ConfirmUserPictureUploadMutation>(
    ConfirmUserPictureUploadDocument,
    {
      update,
    }
  );

  const handleCreateUser = async (input: CreateUserInput) => {
    try {
      const result = await createUser({
        variables: { input },
      });

      toast.success(t('notifications.createSuccess'));
      return result.data?.createUser;
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(t('notifications.createError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleUpdateUser = async (id: string, input: UpdateUserInput) => {
    try {
      const result = await updateUser({
        variables: { id, input },
      });

      toast.success(t('notifications.updateSuccess'));
      return result.data?.updateUser;
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(t('notifications.updateError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleDeleteUser = async (params: MutationDeleteUserArgs, name: string) => {
    const { id, scope } = params;
    try {
      const result = await deleteUser({
        variables: { id, scope },
      });

      toast.success(t('notifications.deleteSuccess'), {
        description: `${name} has been removed from the system`,
      });
      return result.data?.deleteUser;
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(t('notifications.deleteError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleUploadUserPicture = async (input: UploadUserPictureInput) => {
    try {
      const result = await uploadUserPicture({
        variables: { input },
      });

      toast.success(t('notifications.uploadPictureSuccess'));
      return result.data?.uploadUserPicture;
    } catch (error) {
      console.error('Error uploading user picture:', error);
      toast.error(t('notifications.uploadPictureError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  /**
   * The administrator target. `userId` and `scope` are the caller's claim about whose
   * picture this is, and they reach the storage path — so they are sent identically to
   * both steps and the API re-checks the permission at each. Nothing here is trusted to
   * carry authorization between the two requests.
   *
   * No toast on failure: the upload dialog renders it inline where the user is looking.
   */
  const handleUploadUserPictureDirect = async (
    target: { userId: string; scope: Scope },
    file: DirectUploadBody,
    options?: { signal?: AbortSignal }
  ) => {
    const result = await runDirectUpload(
      {
        mint: async (descriptor) =>
          (
            await requestUserPictureUploadUrl({
              variables: { input: { ...descriptor, ...target } },
            })
          ).data?.requestUserPictureUploadUrl,
        confirm: async ({ filename }) =>
          (
            await confirmUserPictureUpload({
              variables: { input: { filename, ...target } },
            })
          ).data?.confirmUserPictureUpload,
      },
      file,
      options
    );

    toast.success(t('notifications.uploadPictureSuccess'));
    return result;
  };

  return {
    createUser: handleCreateUser,
    updateUser: handleUpdateUser,
    deleteUser: handleDeleteUser,
    uploadUserPicture: handleUploadUserPicture,
    uploadUserPictureDirect: handleUploadUserPictureDirect,
  };
}
