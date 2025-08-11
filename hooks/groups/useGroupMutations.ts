import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  AddGroupPermissionInput,
  AddGroupTagInput,
  CreateGroupInput,
  Group,
  GroupPermission,
  GroupTag,
  RemoveGroupPermissionInput,
  RemoveGroupTagInput,
  UpdateGroupInput,
} from '@/graphql/generated/types';
import { ADD_GROUP_TAG, REMOVE_GROUP_TAG } from '@/hooks/tags/mutations';

import { evictGroupsCache } from './cache';
import {
  CREATE_GROUP,
  UPDATE_GROUP,
  DELETE_GROUP,
  ADD_GROUP_PERMISSION,
  REMOVE_GROUP_PERMISSION,
} from './mutations';

export function useGroupMutations() {
  const t = useTranslations('groups');

  const update = (cache: ApolloCache<any>) => {
    evictGroupsCache(cache);
  };

  const [createGroup] = useMutation<{ createGroup: Group }>(CREATE_GROUP, {
    update,
  });

  const [updateGroup] = useMutation<{ updateGroup: Group }>(UPDATE_GROUP, {
    update,
  });

  const [deleteGroup] = useMutation<{ deleteGroup: boolean }>(DELETE_GROUP, {
    update,
  });

  const [addGroupPermission] = useMutation<{ addGroupPermission: GroupPermission }>(
    ADD_GROUP_PERMISSION,
    {
      update,
    }
  );

  const [removeGroupPermission] = useMutation<{ removeGroupPermission: GroupPermission }>(
    REMOVE_GROUP_PERMISSION,
    {
      update,
    }
  );

  const [addGroupTag] = useMutation<{ addGroupTag: GroupTag }>(ADD_GROUP_TAG, {
    update,
  });

  const [removeGroupTag] = useMutation<{ removeGroupTag: boolean }>(REMOVE_GROUP_TAG, {
    update,
  });

  const handleCreateGroup = async (input: CreateGroupInput) => {
    try {
      const result = await createGroup({
        variables: { input },
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

  const handleAddGroupTag = async (input: AddGroupTagInput) => {
    try {
      const result = await addGroupTag({
        variables: { input },
      });

      toast.success(t('notifications.tagAddedSuccess'));
      return result.data?.addGroupTag;
    } catch (error) {
      console.error('Error adding group tag:', error);
      toast.error(t('notifications.tagAddedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveGroupTag = async (input: RemoveGroupTagInput) => {
    try {
      await removeGroupTag({
        variables: { input },
      });

      toast.success(t('notifications.tagRemovedSuccess'));
    } catch (error) {
      console.error('Error removing group tag:', error);
      toast.error(t('notifications.tagRemovedError'), {
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
    addGroupTag: handleAddGroupTag,
    removeGroupTag: handleRemoveGroupTag,
  };
}
