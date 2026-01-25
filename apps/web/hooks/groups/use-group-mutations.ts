import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  CreateGroupDocument,
  CreateGroupInput,
  DeleteGroupDocument,
  Group,
  MutationDeleteGroupArgs,
  MutationUpdateGroupArgs,
  UpdateGroupDocument,
} from '@grantjs/schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { evictGroupsCache } from './cache';

export function useGroupMutations() {
  const t = useTranslations('groups');

  const update = (cache: ApolloCache) => {
    evictGroupsCache(cache);
  };

  const [createGroup] = useMutation<{ createGroup: Group }>(CreateGroupDocument, {
    update,
  });

  const [updateGroup] = useMutation<{ updateGroup: Group }>(UpdateGroupDocument, {
    update,
  });

  const [deleteGroup] = useMutation<{ deleteGroup: Group }>(DeleteGroupDocument, {
    update,
  });

  const handleCreateGroup = async (input: CreateGroupInput) => {
    try {
      const result = await createGroup({
        variables: { input },
      });

      toast.success(t('notifications.createSuccess'));
      return result.data?.createGroup;
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error(t('notifications.createError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleUpdateGroup = async (variables: MutationUpdateGroupArgs) => {
    try {
      const result = await updateGroup({
        variables,
      });

      toast.success(t('notifications.updateSuccess'));
      return result.data?.updateGroup;
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error(t('notifications.updateError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleDeleteGroup = async (variables: MutationDeleteGroupArgs, name: string) => {
    try {
      const result = await deleteGroup({
        variables,
      });

      toast.success(t('notifications.deleteSuccess'), {
        description: `${name} has been removed from the system`,
      });
      return result.data?.deleteGroup;
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error(t('notifications.deleteError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    createGroup: handleCreateGroup,
    updateGroup: handleUpdateGroup,
    deleteGroup: handleDeleteGroup,
  };
}
