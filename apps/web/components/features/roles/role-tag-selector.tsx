'use client';

import { TagSelector } from '@/components/common';
import { useRolesStore } from '@/stores/roles.store';

export function RoleTagSelector() {
  const selectedTagIds = useRolesStore((state) => state.selectedTagIds);
  const setSelectedTagIds = useRolesStore((state) => state.setSelectedTagIds);

  return <TagSelector selectedTagIds={selectedTagIds} onTagIdsChange={setSelectedTagIds} />;
}
