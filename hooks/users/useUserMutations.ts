import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { CreateUserInput, UpdateUserInput, User } from '@/graphql/generated/types';

import { evictUsersCache } from './cache';
import { CREATE_USER, UPDATE_USER, DELETE_USER } from './mutations';

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

  return {
    createUser: handleCreateUser,
    updateUser: handleUpdateUser,
    deleteUser: handleDeleteUser,
  };
}
