import { useMutation } from '@apollo/client';

import { ADD_PERMISSION_TAG, REMOVE_PERMISSION_TAG } from '@/hooks/tags/mutations';

import { CREATE_PERMISSION, UPDATE_PERMISSION, DELETE_PERMISSION } from './mutations';

export function usePermissionMutations() {
  const [createPermission, { loading: createLoading }] = useMutation(CREATE_PERMISSION);

  const [updatePermission, { loading: updateLoading }] = useMutation(UPDATE_PERMISSION);

  const [deletePermission, { loading: deleteLoading }] = useMutation(DELETE_PERMISSION);

  const [addPermissionTag] = useMutation<{ addPermissionTag: any }>(ADD_PERMISSION_TAG);

  const [removePermissionTag] = useMutation<{ removePermissionTag: boolean }>(
    REMOVE_PERMISSION_TAG
  );

  return {
    createPermission,
    updatePermission,
    deletePermission,
    addPermissionTag,
    removePermissionTag,
    loading: createLoading || updateLoading || deleteLoading,
  };
}
