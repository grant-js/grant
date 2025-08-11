import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  AddUserRoleInput,
  AddUserTagInput,
  CreateUserInput,
  RemoveUserRoleInput,
  RemoveUserTagInput,
  UpdateUserInput,
  User,
  UserRole,
  UserTag,
} from '@/graphql/generated/types';
import { ADD_USER_TAG, REMOVE_USER_TAG } from '@/hooks/tags/mutations';

import { evictUsersCache } from './cache';
import {
  CREATE_USER,
  UPDATE_USER,
  DELETE_USER,
  ADD_USER_ROLE,
  REMOVE_USER_ROLE,
} from './mutations';

export function useUserMutations() {
  const t = useTranslations('users');

  const update = (cache: ApolloCache<any>) => {
    evictUsersCache(cache);
  };

  const [createUser] = useMutation<{ createUser: User }>(CREATE_USER, {
    update,
  });

  const [updateUser] = useMutation<{ updateUser: User }>(UPDATE_USER, {
    update,
  });

  const [deleteUser] = useMutation<{ deleteUser: User }>(DELETE_USER, {
    update,
  });

  const [addUserRole] = useMutation<{ addUserRole: UserRole }>(ADD_USER_ROLE, {
    update,
  });

  const [removeUserRole] = useMutation<{ removeUserRole: UserRole }>(REMOVE_USER_ROLE, {
    update,
  });

  const [addUserTag] = useMutation<{ addUserTag: UserTag }>(ADD_USER_TAG, {
    update,
  });

  const [removeUserTag] = useMutation<{ removeUserTag: UserTag }>(REMOVE_USER_TAG, {
    update,
  });

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
