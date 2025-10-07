'use client';

import { Limit } from '@/components/common';
import { usePermissionsStore } from '@/stores/permissions.store';

export function PermissionLimit() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const limit = usePermissionsStore((state) => state.limit);
  const setLimit = usePermissionsStore((state) => state.setLimit);

  return (
    <Limit
      limit={limit}
      onLimitChange={setLimit}
      namespace="permissions"
      translationKey="limit"
      options={[10, 20, 50, 100]}
    />
  );
}
