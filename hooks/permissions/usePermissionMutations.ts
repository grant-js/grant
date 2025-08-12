import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  CreatePermissionInput,
  Permission,
  UpdatePermissionInput,
} from '@/graphql/generated/types';

import { evictPermissionsCache } from './cache';
import { CREATE_PERMISSION, UPDATE_PERMISSION, DELETE_PERMISSION } from './mutations';

export function usePermissionMutations() {
  const t = useTranslations('permissions');
  const update = (cache: ApolloCache<any>) => {
    evictPermissionsCache(cache);
  };

  const [createPermission] = useMutation<{ createPermission: Permission }>(CREATE_PERMISSION, {
    update,
  });

  const [updatePermission] = useMutation<{ updatePermission: Permission }>(UPDATE_PERMISSION, {
    update,
  });

  const [deletePermission] = useMutation<{ deletePermission: Permission }>(DELETE_PERMISSION, {
    update,
  });

  const handleCreatePermission = async (input: CreatePermissionInput) => {
    try {
      console.log('Creating permission with input:', input);
      const result = await createPermission({
        variables: { input },
      });

      console.log('Create permission result:', result);
      toast.success(t('notifications.createSuccess'));
      return result.data?.createPermission;
    } catch (error) {
      console.error('Error creating permission:', error);
      toast.error(t('notifications.createError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleUpdatePermission = async (id: string, input: UpdatePermissionInput) => {
    try {
      const result = await updatePermission({
        variables: { id, input },
      });

      toast.success(t('notifications.updateSuccess'));
      return result.data?.updatePermission;
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error(t('notifications.updateError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleDeletePermission = async (id: string) => {
    try {
      const result = await deletePermission({
        variables: { id },
      });

      console.log('Delete permission result:', result);
      toast.success(t('notifications.deleteSuccess'));
      return result.data?.deletePermission;
    } catch (error) {
      console.error('Error deleting permission:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        graphQLErrors: (error as any)?.graphQLErrors,
        networkError: (error as any)?.networkError,
      });
      toast.error(t('notifications.deleteError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    createPermission: handleCreatePermission,
    updatePermission: handleUpdatePermission,
    deletePermission: handleDeletePermission,
  };
}
