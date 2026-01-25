'use client';

import { TagSelector } from '@/components/common';
import { useUsersStore } from '@/stores/users.store';

export function UserTagSelector() {
  const selectedTagIds = useUsersStore((state) => state.selectedTagIds);
  const setSelectedTagIds = useUsersStore((state) => state.setSelectedTagIds);

  return <TagSelector selectedTagIds={selectedTagIds} onTagIdsChange={setSelectedTagIds} />;
}
