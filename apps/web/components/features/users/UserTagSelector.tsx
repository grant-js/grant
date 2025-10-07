'use client';

import { Tags } from '@/components/common';
import { useUsersStore } from '@/stores/users.store';

export function UserTagSelector() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const selectedTagIds = useUsersStore((state) => state.selectedTagIds);
  const setSelectedTagIds = useUsersStore((state) => state.setSelectedTagIds);

  return <Tags selectedTagIds={selectedTagIds} onTagIdsChange={setSelectedTagIds} />;
}
