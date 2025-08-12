import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  CreateOrganizationInput,
  Organization,
  UpdateOrganizationInput,
} from '@/graphql/generated/types';

import { evictOrganizationsCache } from './cache';
import { CREATE_ORGANIZATION, UPDATE_ORGANIZATION, DELETE_ORGANIZATION } from './mutations';

export function useOrganizationMutations() {
  const t = useTranslations('organizations');

  const update = (cache: ApolloCache<any>) => {
    evictOrganizationsCache(cache);
  };

  const [createOrganization] = useMutation<{ createOrganization: Organization }>(
    CREATE_ORGANIZATION,
    {
      update,
    }
  );

  const [updateOrganization] = useMutation<{ updateOrganization: Organization }>(
    UPDATE_ORGANIZATION,
    {
      update,
    }
  );

  const [deleteOrganization] = useMutation<{ deleteOrganization: Organization }>(
    DELETE_ORGANIZATION,
    {
      update,
    }
  );

  const handleCreateOrganization = async (input: CreateOrganizationInput) => {
    try {
      const result = await createOrganization({
        variables: { input },
      });

      toast.success(t('notifications.createSuccess'));
      return result.data?.createOrganization;
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error(t('notifications.createError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleUpdateOrganization = async (id: string, input: UpdateOrganizationInput) => {
    try {
      const result = await updateOrganization({
        variables: { id, input },
      });

      toast.success(t('notifications.updateSuccess'));
      return result.data?.updateOrganization;
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error(t('notifications.updateError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleDeleteOrganization = async (id: string, _name: string) => {
    try {
      const result = await deleteOrganization({
        variables: { id },
      });

      toast.success(t('notifications.deleteSuccess'));
      return result.data?.deleteOrganization;
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error(t('notifications.deleteError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    createOrganization: handleCreateOrganization,
    updateOrganization: handleUpdateOrganization,
    deleteOrganization: handleDeleteOrganization,
  };
}
