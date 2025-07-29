import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { User } from '@/graphql/generated/types';
import { ADD_USER_TAG, REMOVE_USER_TAG } from '@/hooks/tags/mutations';

import { evictUsersCache } from './cache';
import {
  CREATE_USER,
  UPDATE_USER,
  DELETE_USER,
  ADD_USER_ROLE,
  REMOVE_USER_ROLE,
} from './mutations';

interface CreateUserInput {
  name: string;
  email: string;
}

interface UpdateUserInput {
  name?: string;
  email?: string;
}

interface AddUserRoleInput {
  userId: string;
  roleId: string;
}

interface RemoveUserRoleInput {
  userId: string;
  roleId: string;
}

interface AddUserTagInput {
  userId: string;
  tagId: string;
}

interface RemoveUserTagInput {
  userId: string;
  tagId: string;
}

export function useUserMutations() {
  const t = useTranslations('users');

  const [createUser] = useMutation<{ createUser: User }>(CREATE_USER, {
    update(cache) {
      evictUsersCache(cache);
    },
  });

  const [updateUser] = useMutation<{ updateUser: User }>(UPDATE_USER, {
    update(cache) {
      evictUsersCache(cache);
    },
  });

  const [deleteUser] = useMutation<{ deleteUser: User }>(DELETE_USER, {
    update(cache) {
      evictUsersCache(cache);
      cache.gc();
    },
  });

  const [addUserRole] = useMutation<{ addUserRole: any }>(ADD_USER_ROLE, {
    update(cache) {
      evictUsersCache(cache);
    },
  });

  const [removeUserRole] = useMutation<{ removeUserRole: any }>(REMOVE_USER_ROLE, {
    update(cache) {
      evictUsersCache(cache);
    },
  });

  const [addUserTag] = useMutation<{ addUserTag: any }>(ADD_USER_TAG, {
    update(cache) {
      evictUsersCache(cache);
    },
  });

  const [removeUserTag] = useMutation<{ removeUserTag: boolean }>(REMOVE_USER_TAG, {
    update(cache) {
      evictUsersCache(cache);
    },
  });

  const handleCreateUser = async (input: CreateUserInput) => {
    try {
      const result = await createUser({
        variables: { input },
        refetchQueries: ['GetUsers'],
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
        refetchQueries: ['GetUsers'],
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

  const handleDeleteUser = async (id: string, name: string) => {
    try {
      const result = await deleteUser({
        variables: { id },
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

  const handleAddUserRole = async (input: AddUserRoleInput) => {
    try {
      const result = await addUserRole({
        variables: { input },
        refetchQueries: ['GetUsers'],
      });

      toast.success(t('notifications.roleAddedSuccess'));
      return result.data?.addUserRole;
    } catch (error) {
      console.error('Error adding user role:', error);
      toast.error(t('notifications.roleAddedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveUserRole = async (input: RemoveUserRoleInput) => {
    try {
      const result = await removeUserRole({
        variables: { input },
        refetchQueries: ['GetUsers'],
      });

      toast.success(t('notifications.roleRemovedSuccess'));
      return result.data?.removeUserRole;
    } catch (error) {
      console.error('Error removing user role:', error);
      toast.error(t('notifications.roleRemovedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleAddUserTag = async (input: AddUserTagInput) => {
    try {
      const result = await addUserTag({
        variables: { input },
        refetchQueries: ['GetUsers'],
      });

      toast.success(t('notifications.tagAddedSuccess'));
      return result.data?.addUserTag;
    } catch (error) {
      console.error('Error adding user tag:', error);
      toast.error(t('notifications.tagAddedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveUserTag = async (input: RemoveUserTagInput) => {
    try {
      await removeUserTag({
        variables: { input },
        refetchQueries: ['GetUsers'],
      });

      toast.success(t('notifications.tagRemovedSuccess'));
    } catch (error) {
      console.error('Error removing user tag:', error);
      toast.error(t('notifications.tagRemovedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    createUser: handleCreateUser,
    updateUser: handleUpdateUser,
    deleteUser: handleDeleteUser,
    addUserRole: handleAddUserRole,
    removeUserRole: handleRemoveUserRole,
    addUserTag: handleAddUserTag,
    removeUserTag: handleRemoveUserTag,
  };
}
