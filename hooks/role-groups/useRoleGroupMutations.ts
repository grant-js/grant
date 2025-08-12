import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { AddRoleGroupInput, RemoveRoleGroupInput, RoleGroup } from '@/graphql/generated/types';

import { evictRoleGroupsCache } from './cache';
import { ADD_ROLE_GROUP, REMOVE_ROLE_GROUP } from './mutations';

export function useRoleGroupMutations() {
  const t = useTranslations('roles');

  const update = (cache: ApolloCache<any>) => {
    evictRoleGroupsCache(cache);
  };

  const [addRoleGroup] = useMutation<{ addRoleGroup: RoleGroup }>(ADD_ROLE_GROUP, {
    update,
  });

  const [removeRoleGroup] = useMutation<{ removeRoleGroup: RoleGroup }>(REMOVE_ROLE_GROUP, {
    update,
  });

  const handleAddRoleGroup = async (input: AddRoleGroupInput) => {
    try {
      const result = await addRoleGroup({
        variables: { input },
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

  return {
    addRoleGroup: handleAddRoleGroup,
    removeRoleGroup: handleRemoveRoleGroup,
  };
}
