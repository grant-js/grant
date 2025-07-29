import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Role } from '@/graphql/generated/types';
import { ADD_ROLE_TAG, REMOVE_ROLE_TAG } from '@/hooks/tags/mutations';

import { evictRolesCache } from './cache';
import {
  CREATE_ROLE,
  UPDATE_ROLE,
  DELETE_ROLE,
  ADD_ROLE_GROUP,
  REMOVE_ROLE_GROUP,
} from './mutations';

interface CreateRoleInput {
  name: string;
  description?: string;
}

interface UpdateRoleInput {
  name?: string;
  description?: string;
}

interface AddRoleGroupInput {
  roleId: string;
  groupId: string;
}

interface RemoveRoleGroupInput {
  roleId: string;
  groupId: string;
}

interface AddRoleTagInput {
  roleId: string;
  tagId: string;
}

interface RemoveRoleTagInput {
  roleId: string;
  tagId: string;
}

export function useRoleMutations() {
  const t = useTranslations('roles');

  const [createRole] = useMutation<{ createRole: Role }>(CREATE_ROLE, {
    update(cache) {
      evictRolesCache(cache);
    },
  });

  const [updateRole] = useMutation<{ updateRole: Role }>(UPDATE_ROLE, {
    update(cache) {
      evictRolesCache(cache);
    },
  });

  const [deleteRole] = useMutation<{ deleteRole: boolean }>(DELETE_ROLE, {
    update(cache) {
      evictRolesCache(cache);
      cache.gc();
    },
  });

  const [addRoleGroup] = useMutation<{ addRoleGroup: any }>(ADD_ROLE_GROUP, {
    update(cache) {
      evictRolesCache(cache);
    },
  });

  const [removeRoleGroup] = useMutation<{ removeRoleGroup: any }>(REMOVE_ROLE_GROUP, {
    update(cache) {
      evictRolesCache(cache);
    },
  });

  const [addRoleTag] = useMutation<{ addRoleTag: any }>(ADD_ROLE_TAG, {
    update(cache) {
      evictRolesCache(cache);
    },
  });

  const [removeRoleTag] = useMutation<{ removeRoleTag: boolean }>(REMOVE_ROLE_TAG, {
    update(cache) {
      evictRolesCache(cache);
    },
  });

  const handleCreateRole = async (input: CreateRoleInput) => {
    try {
      const result = await createRole({
        variables: { input },
        refetchQueries: ['GetRoles'],
      });

      toast.success(t('notifications.createSuccess'));
      return result.data?.createRole;
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error(t('notifications.createError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleUpdateRole = async (id: string, input: UpdateRoleInput) => {
    try {
      const result = await updateRole({
        variables: { id, input },
        refetchQueries: ['GetRoles'],
      });

      toast.success(t('notifications.updateSuccess'));
      return result.data?.updateRole;
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(t('notifications.updateError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleDeleteRole = async (id: string, name: string) => {
    try {
      const result = await deleteRole({
        variables: { id },
      });

      toast.success(t('notifications.deleteSuccess'), {
        description: `${name} has been removed from the system`,
      });
      return result.data?.deleteRole;
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error(t('notifications.deleteError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleAddRoleGroup = async (input: AddRoleGroupInput) => {
    try {
      const result = await addRoleGroup({
        variables: { input },
        refetchQueries: ['GetRoles'],
      });

      toast.success(t('notifications.groupAddedSuccess'));
      return result.data?.addRoleGroup;
    } catch (error) {
      console.error('Error adding role group:', error);
      toast.error(t('notifications.groupAddedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveRoleGroup = async (input: RemoveRoleGroupInput) => {
    try {
      const result = await removeRoleGroup({
        variables: { input },
        refetchQueries: ['GetRoles'],
      });

      toast.success(t('notifications.groupRemovedSuccess'));
      return result.data?.removeRoleGroup;
    } catch (error) {
      console.error('Error removing role group:', error);
      toast.error(t('notifications.groupRemovedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleAddRoleTag = async (input: AddRoleTagInput) => {
    try {
      const result = await addRoleTag({
        variables: { input },
        refetchQueries: ['GetRoles'],
      });

      toast.success(t('notifications.tagAddedSuccess'));
      return result.data?.addRoleTag;
    } catch (error) {
      console.error('Error adding role tag:', error);
      toast.error(t('notifications.tagAddedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveRoleTag = async (input: RemoveRoleTagInput) => {
    try {
      await removeRoleTag({
        variables: { input },
        refetchQueries: ['GetRoles'],
      });

      toast.success(t('notifications.tagRemovedSuccess'));
    } catch (error) {
      console.error('Error removing role tag:', error);
      toast.error(t('notifications.tagRemovedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    createRole: handleCreateRole,
    updateRole: handleUpdateRole,
    deleteRole: handleDeleteRole,
    addRoleGroup: handleAddRoleGroup,
    removeRoleGroup: handleRemoveRoleGroup,
    addRoleTag: handleAddRoleTag,
    removeRoleTag: handleRemoveRoleTag,
  };
}
