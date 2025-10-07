'use client';

import { Tags } from '@/components/common';
import { useRolesStore } from '@/stores/roles.store';

export function RoleTagSelector() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const selectedTagIds = useRolesStore((state) => state.selectedTagIds);
  const setSelectedTagIds = useRolesStore((state) => state.setSelectedTagIds);

  return <Tags selectedTagIds={selectedTagIds} onTagIdsChange={setSelectedTagIds} />;
}
