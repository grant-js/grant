import { ApolloCache, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  AddOrganizationTagInput,
  OrganizationTag,
  RemoveOrganizationTagInput,
} from '@/graphql/generated/types';

import { evictOrganizationTagsCache } from './cache';
import { ADD_ORGANIZATION_TAG, REMOVE_ORGANIZATION_TAG } from './mutations';

export function useOrganizationTagMutations() {
  const t = useTranslations('organizations');

  const update = (cache: ApolloCache<any>) => {
    evictOrganizationTagsCache(cache);
  };

  const [addOrganizationTag] = useMutation<{ addOrganizationTag: OrganizationTag }>(
    ADD_ORGANIZATION_TAG,
    {
      update,
    }
  );

  const [removeOrganizationTag] = useMutation<{ removeOrganizationTag: OrganizationTag }>(
    REMOVE_ORGANIZATION_TAG,
    {
      update,
    }
  );

  const handleAddOrganizationTag = async (input: AddOrganizationTagInput) => {
    try {
      const result = await addOrganizationTag({
        variables: { input },
      });

      toast.success(t('notifications.tagAddedSuccess'));
      return result.data?.addOrganizationTag;
    } catch (error) {
      console.error('Error adding organization tag:', error);
      toast.error(t('notifications.tagAddedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveOrganizationTag = async (input: RemoveOrganizationTagInput) => {
    try {
      const result = await removeOrganizationTag({
        variables: { input },
      });

      toast.success(t('notifications.tagRemovedSuccess'));
      return result.data?.removeOrganizationTag;
    } catch (error) {
      console.error('Error removing organization tag:', error);
      toast.error(t('notifications.tagRemovedError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    addOrganizationTag: handleAddOrganizationTag,
    removeOrganizationTag: handleRemoveOrganizationTag,
  };
}
