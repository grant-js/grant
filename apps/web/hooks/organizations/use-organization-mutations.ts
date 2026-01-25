import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  CreateOrganizationInput,
  MutationDeleteOrganizationArgs,
  Organization,
  UpdateOrganizationInput,
} from '@grantjs/schema';
import {
  CreateOrganizationDocument,
  UpdateOrganizationDocument,
  DeleteOrganizationDocument,
} from '@grantjs/schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { evictOrganizationsCache } from './cache';

export function useOrganizationMutations() {
  const t = useTranslations('organizations');

  const update = (cache: ApolloCache) => {
    evictOrganizationsCache(cache);
  };

  const [createOrganization] = useMutation<{ createOrganization: Organization }>(
    CreateOrganizationDocument,
    {
      update,
    }
  );

  const [updateOrganization] = useMutation<{ updateOrganization: Organization }>(
    UpdateOrganizationDocument,
    {
      update,
    }
  );

  const [deleteOrganization] = useMutation<{ deleteOrganization: Organization }>(
    DeleteOrganizationDocument,
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

  const handleDeleteOrganization = async (
    variables: MutationDeleteOrganizationArgs,
    _name: string
  ) => {
    try {
      const result = await deleteOrganization({
        variables,
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
