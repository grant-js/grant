import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { AddUserRoleInput, RemoveUserRoleInput, UserRole } from '@/graphql/generated/types';

import { evictUserRolesCache } from './cache';
import { ADD_USER_ROLE, REMOVE_USER_ROLE } from './mutations';

export function useUserRoleMutations() {
  const t = useTranslations('users');

  const update = (cache: ApolloCache<any>) => {
    evictUserRolesCache(cache);
  };

  const [addUserRole] = useMutation<{ addUserRole: UserRole }>(ADD_USER_ROLE, {
    update,
  });

  const [removeUserRole] = useMutation<{ removeUserRole: UserRole }>(REMOVE_USER_ROLE, {
    update,
  });

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

  return {
    addUserRole: handleAddUserRole,
    removeUserRole: handleRemoveUserRole,
  };
}
