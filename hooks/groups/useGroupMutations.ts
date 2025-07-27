import { useMutation } from '@apollo/client';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Group } from '@/graphql/generated/types';
import { evictGroupsCache } from '@/components/features/groups/cache';
import {
  CREATE_GROUP,
  UPDATE_GROUP,
  DELETE_GROUP,
  ADD_GROUP_PERMISSION,
  REMOVE_GROUP_PERMISSION,
} from './mutations';

interface CreateGroupInput {
  name: string;
  description?: string;
}

interface UpdateGroupInput {
  name?: string;
  description?: string;
}

interface AddGroupPermissionInput {
  groupId: string;
  permissionId: string;
}

interface RemoveGroupPermissionInput {
  groupId: string;
  permissionId: string;
}

export function useGroupMutations() {
  const t = useTranslations('groups');

  const [createGroup] = useMutation<{ createGroup: Group }>(CREATE_GROUP, {
    update(cache) {
      evictGroupsCache(cache);
    },
  });

  const [updateGroup] = useMutation<{ updateGroup: Group }>(UPDATE_GROUP, {
    update(cache) {
      evictGroupsCache(cache);
    },
  });

  const [deleteGroup] = useMutation<{ deleteGroup: boolean }>(DELETE_GROUP, {
    update(cache) {
      evictGroupsCache(cache);
      cache.gc();
    },
  });

  const [addGroupPermission] = useMutation<{ addGroupPermission: any }>(ADD_GROUP_PERMISSION, {
    update(cache) {
      evictGroupsCache(cache);
    },
  });

  const [removeGroupPermission] = useMutation<{ removeGroupPermission: boolean }>(
    REMOVE_GROUP_PERMISSION,
    {
      update(cache) {
        evictGroupsCache(cache);
      },
    }
  );

  const handleCreateGroup = async (input: CreateGroupInput) => {
    try {
      const result = await createGroup({
        variables: { input },
        refetchQueries: ['GetGroups'],
      });

      toast.success(t('notifications.createSuccess'));
      return result.data?.createGroup;
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error(t('notifications.createError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleUpdateGroup = async (id: string, input: UpdateGroupInput) => {
    try {
      const result = await updateGroup({
        variables: { id, input },
        refetchQueries: ['GetGroups'],
      });

      toast.success(t('notifications.updateSuccess'));
      return result.data?.updateGroup;
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error(t('notifications.updateError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    try {
      const result = await deleteGroup({
        variables: { id },
      });

      toast.success(t('notifications.deleteSuccess'), {
        description: `${name} has been removed from the system`,
      });
      return result.data?.deleteGroup;
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error(t('notifications.deleteError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleAddGroupPermission = async (input: AddGroupPermissionInput) => {
    try {
      const result = await addGroupPermission({
        variables: { input },
        refetchQueries: ['GetGroups'],
      });

      toast.success(t('notifications.permissionAddedSuccess'));
      return result.data?.addGroupPermission;
    } catch (error) {
      console.error('Error adding group permission:', error);
      toast.error(t('notifications.permissionAddedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveGroupPermission = async (input: RemoveGroupPermissionInput) => {
    try {
      const result = await removeGroupPermission({
        variables: { input },
        refetchQueries: ['GetGroups'],
      });

      toast.success(t('notifications.permissionRemovedSuccess'));
      return result.data?.removeGroupPermission;
    } catch (error) {
      console.error('Error removing group permission:', error);
      toast.error(t('notifications.permissionRemovedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    createGroup: handleCreateGroup,
    updateGroup: handleUpdateGroup,
    deleteGroup: handleDeleteGroup,
    addGroupPermission: handleAddGroupPermission,
    removeGroupPermission: handleRemoveGroupPermission,
  };
}
