import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  AddOrganizationRoleInput,
  OrganizationRole,
  RemoveOrganizationRoleInput,
} from '@/graphql/generated/types';

import { evictOrganizationRolesCache } from './cache';
import { ADD_ORGANIZATION_ROLE, REMOVE_ORGANIZATION_ROLE } from './mutations';

export function useOrganizationRoleMutations() {
  const t = useTranslations('organizations');

  const update = (cache: ApolloCache<any>) => {
    evictOrganizationRolesCache(cache);
  };

  const [addOrganizationRole] = useMutation<{ addOrganizationRole: OrganizationRole }>(
    ADD_ORGANIZATION_ROLE,
    {
      update,
    }
  );

  const [removeOrganizationRole] = useMutation<{ removeOrganizationRole: OrganizationRole }>(
    REMOVE_ORGANIZATION_ROLE,
    {
      update,
    }
  );

  const handleAddOrganizationRole = async (input: AddOrganizationRoleInput) => {
    try {
      const result = await addOrganizationRole({
        variables: { input },
      });

      toast.success(t('notifications.roleAddedSuccess'));
      return result.data?.addOrganizationRole;
    } catch (error) {
      console.error('Error adding organization role:', error);
      toast.error(t('notifications.roleAddedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveOrganizationRole = async (input: RemoveOrganizationRoleInput) => {
    try {
      const result = await removeOrganizationRole({
        variables: { input },
      });

      toast.success(t('notifications.roleRemovedSuccess'));
      return result.data?.removeOrganizationRole;
    } catch (error) {
      console.error('Error removing organization role:', error);
      toast.error(t('notifications.roleRemovedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    addOrganizationRole: handleAddOrganizationRole,
    removeOrganizationRole: handleRemoveOrganizationRole,
  };
}
