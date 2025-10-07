import { Limit } from '@/components/common';
import { useUsersStore } from '@/stores/users.store';

export function UserLimit() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const limit = useUsersStore((state) => state.limit);
  const setLimit = useUsersStore((state) => state.setLimit);

  return (
    <Limit
      limit={limit}
      onLimitChange={setLimit}
      namespace="users"
      translationKey="limit"
      options={[10, 20, 50, 100]}
    />
  );
}
