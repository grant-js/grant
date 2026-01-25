import { Limit } from '@/components/common';
import { useMembersStore } from '@/stores/members.store';

export function MemberLimit() {
  const limit = useMembersStore((state) => state.limit);
  const setLimit = useMembersStore((state) => state.setLimit);

  return (
    <Limit
      limit={limit}
      onLimitChange={setLimit}
      namespace="members"
      translationKey="limit"
      options={[10, 20, 50, 100]}
    />
  );
}
