import { Limit } from '@/components/common';
import { useUsersStore } from '@/stores/users.store';

export function UserLimit() {
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
