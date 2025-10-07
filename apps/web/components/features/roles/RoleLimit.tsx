import { Limit } from '@/components/common';
import { useRolesStore } from '@/stores/roles.store';

export function RoleLimit() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const limit = useRolesStore((state) => state.limit);
  const setLimit = useRolesStore((state) => state.setLimit);

  return (
    <Limit
      limit={limit}
      onLimitChange={setLimit}
      namespace="roles"
      translationKey="limit"
      options={[10, 20, 50, 100]}
    />
  );
}
