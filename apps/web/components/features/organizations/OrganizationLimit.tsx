import { Limit } from '@/components/common';
import { useOrganizationsStore } from '@/stores/organizations.store';

export function OrganizationLimit() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const limit = useOrganizationsStore((state) => state.limit);
  const setLimit = useOrganizationsStore((state) => state.setLimit);

  return (
    <Limit
      limit={limit}
      onLimitChange={setLimit}
      namespace="organizations"
      translationKey="limit"
      options={[10, 20, 50, 100]}
    />
  );
}
