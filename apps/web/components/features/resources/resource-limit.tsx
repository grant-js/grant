import { Limit } from '@/components/common';
import { useResourcesStore } from '@/stores/resources.store';

export function ResourceLimit() {
  const limit = useResourcesStore((state) => state.limit);
  const setLimit = useResourcesStore((state) => state.setLimit);

  return (
    <Limit
      limit={limit}
      onLimitChange={setLimit}
      namespace="resources"
      translationKey="limit"
      options={[10, 20, 50, 100]}
    />
  );
}
