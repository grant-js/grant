import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  CreatePermissionInput,
  MutationDeletePermissionArgs,
  Permission,
  UpdatePermissionInput,
} from '@grantjs/schema';
import {
  CreatePermissionDocument,
  UpdatePermissionDocument,
  DeletePermissionDocument,
} from '@grantjs/schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { evictPermissionsCache } from './cache';

export function usePermissionMutations() {
  const t = useTranslations('permissions');
  const update = (cache: ApolloCache) => {
    evictPermissionsCache(cache);
  };

  const [createPermission] = useMutation<{ createPermission: Permission }>(
    CreatePermissionDocument,
    {
      update,
    }
  );

  const [updatePermission] = useMutation<{ updatePermission: Permission }>(
    UpdatePermissionDocument,
    {
      update,
    }
  );

  const [deletePermission] = useMutation<{ deletePermission: Permission }>(
    DeletePermissionDocument,
    {
      update,
    }
  );

  const handleCreatePermission = async (input: CreatePermissionInput) => {
    try {
      const result = await createPermission({
        variables: { input },
      });

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

  const handleDeletePermission = async (variables: MutationDeletePermissionArgs) => {
    try {
      const result = await deletePermission({
        variables,
      });

      toast.success(t('notifications.deleteSuccess'));
      return result.data?.deletePermission;
    } catch (error) {
      console.error('Error deleting permission:', error);
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
