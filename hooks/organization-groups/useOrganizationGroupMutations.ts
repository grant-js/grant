import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  AddOrganizationGroupInput,
  RemoveOrganizationGroupInput,
  OrganizationGroup,
} from '@/graphql/generated/types';

import { evictOrganizationGroupsCache } from './cache';
import { ADD_ORGANIZATION_GROUP, REMOVE_ORGANIZATION_GROUP } from './mutations';

export function useOrganizationGroupMutations() {
  const t = useTranslations('organizationGroups');

  const update = (cache: ApolloCache<any>) => {
    evictOrganizationGroupsCache(cache);
  };

  const [addOrganizationGroup] = useMutation<{ addOrganizationGroup: OrganizationGroup }>(
    ADD_ORGANIZATION_GROUP,
    {
      update,
    }
  );

  const [removeOrganizationGroup] = useMutation<{ removeOrganizationGroup: OrganizationGroup }>(
    REMOVE_ORGANIZATION_GROUP,
    {
      update,
    }
  );

  const handleAddOrganizationGroup = async (input: AddOrganizationGroupInput) => {
    try {
      const result = await addOrganizationGroup({
        variables: { input },
      });

      toast.success(t('notifications.addSuccess'));
      return result.data?.addOrganizationGroup;
    } catch (error) {
      console.error('Error adding organization group:', error);
      toast.error(t('notifications.addError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveOrganizationGroup = async (input: RemoveOrganizationGroupInput) => {
    try {
      const result = await removeOrganizationGroup({
        variables: { input },
      });

      toast.success(t('notifications.removeSuccess'));
      return result.data?.removeOrganizationGroup;
    } catch (error) {
      console.error('Error removing organization group:', error);
      toast.error(t('notifications.removeError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    addOrganizationGroup: handleAddOrganizationGroup,
    removeOrganizationGroup: handleRemoveOrganizationGroup,
  };
}
