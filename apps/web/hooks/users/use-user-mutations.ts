import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  CreateUserDocument,
  CreateUserInput,
  DeleteUserDocument,
  MutationDeleteUserArgs,
  UpdateUserDocument,
  UpdateUserInput,
  UploadUserPictureDocument,
  UploadUserPictureInput,
  UploadUserPictureResult,
  User,
} from '@grantjs/schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

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

  return {
    createUser: handleCreateUser,
    updateUser: handleUpdateUser,
    deleteUser: handleDeleteUser,
    uploadUserPicture: handleUploadUserPicture,
  };
}
