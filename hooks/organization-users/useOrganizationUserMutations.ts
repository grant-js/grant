import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  AddOrganizationUserInput,
  OrganizationUser,
  RemoveOrganizationUserInput,
} from '@/graphql/generated/types';

import { ADD_ORGANIZATION_USER, REMOVE_ORGANIZATION_USER } from './mutations';

export function useOrganizationUserMutations() {
  const t = useTranslations('organizationUsers');

  const [addOrganizationUser] = useMutation<{ addOrganizationUser: OrganizationUser }>(
    ADD_ORGANIZATION_USER,
    {
      update(cache) {
        // Only evict organization users cache, not the entire users cache
        cache.evict({ fieldName: 'organizationUsers' });
        cache.gc();
      },
    }
  );

  const [removeOrganizationUser] = useMutation<{ removeOrganizationUser: OrganizationUser }>(
    REMOVE_ORGANIZATION_USER,
    {
      // Remove cache eviction since it's handled manually in DeleteUserDialog
    }
  );

  const handleAddOrganizationUser = async (input: AddOrganizationUserInput) => {
    try {
      const result = await addOrganizationUser({
        variables: { input },
        // Remove refetchQueries since cache eviction is handled manually
      });

      toast.success(t('notifications.addSuccess'));
      return result.data?.addOrganizationUser;
    } catch (error) {
      console.error('Error adding organization user:', error);
      toast.error(t('notifications.addError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveOrganizationUser = async (input: RemoveOrganizationUserInput) => {
    try {
      const result = await removeOrganizationUser({
        variables: { input },
        // Remove refetchQueries since cache eviction is handled manually in DeleteUserDialog
      });

      toast.success(t('notifications.removeSuccess'));
      return result.data?.removeOrganizationUser;
    } catch (error) {
      console.error('Error removing organization user:', error);
      toast.error(t('notifications.removeError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    addOrganizationUser: handleAddOrganizationUser,
    removeOrganizationUser: handleRemoveOrganizationUser,
  };
}
