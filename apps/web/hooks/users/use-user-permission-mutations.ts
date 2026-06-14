import { useTranslations } from 'next-intl';
import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  AssignUserPermissionDocument,
  AssignUserPermissionInput,
  RevokeUserPermissionDocument,
  RevokeUserPermissionInput,
  UserPermission,
} from '@grantjs/schema';
import { toast } from 'sonner';

import { evictUsersCache } from './cache';

export function useUserPermissionMutations() {
  const t = useTranslations('users.permissionsPanel');

  const update = (cache: ApolloCache) => {
    evictUsersCache(cache);
  };

  const [assignUserPermission] = useMutation<{ assignUserPermission: UserPermission }>(
    AssignUserPermissionDocument,
    { update }
  );

  const [revokeUserPermission] = useMutation<{ revokeUserPermission: UserPermission }>(
    RevokeUserPermissionDocument,
    { update }
  );

  const handleAssign = async (input: AssignUserPermissionInput) => {
    try {
      const result = await assignUserPermission({ variables: { input } });
      toast.success(t('assignSuccess'));
      return result.data?.assignUserPermission;
    } catch (error) {
      toast.error(t('assignError'), {
        description: error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  };

  const handleRevoke = async (input: RevokeUserPermissionInput) => {
    try {
      const result = await revokeUserPermission({ variables: { input } });
      toast.success(t('revokeSuccess'));
      return result.data?.revokeUserPermission;
    } catch (error) {
      toast.error(t('revokeError'), {
        description: error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  };

  return {
    assignUserPermission: handleAssign,
    revokeUserPermission: handleRevoke,
  };
}
