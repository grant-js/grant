import { useTranslations } from 'next-intl';
import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  AssignRolePermissionDocument,
  AssignRolePermissionInput,
  RevokeRolePermissionDocument,
  RevokeRolePermissionInput,
  RolePermission,
} from '@grantjs/schema';
import { toast } from 'sonner';

import { evictRolesCache } from './cache';

export function useRolePermissionMutations() {
  const t = useTranslations('roles.permissionsPanel');

  const update = (cache: ApolloCache) => {
    evictRolesCache(cache);
  };

  const [assignRolePermission] = useMutation<{ assignRolePermission: RolePermission }>(
    AssignRolePermissionDocument,
    { update }
  );

  const [revokeRolePermission] = useMutation<{ revokeRolePermission: RolePermission }>(
    RevokeRolePermissionDocument,
    { update }
  );

  const handleAssign = async (input: AssignRolePermissionInput) => {
    try {
      const result = await assignRolePermission({ variables: { input } });
      toast.success(t('assignSuccess'));
      return result.data?.assignRolePermission;
    } catch (error) {
      toast.error(t('assignError'), {
        description: error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  };

  const handleRevoke = async (input: RevokeRolePermissionInput) => {
    try {
      const result = await revokeRolePermission({ variables: { input } });
      toast.success(t('revokeSuccess'));
      return result.data?.revokeRolePermission;
    } catch (error) {
      toast.error(t('revokeError'), {
        description: error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  };

  return {
    assignRolePermission: handleAssign,
    revokeRolePermission: handleRevoke,
  };
}
