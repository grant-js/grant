'use client';

import { TagSelector } from '@/components/common';
import { usePermissionsStore } from '@/stores/permissions.store';

export function PermissionTagSelector() {
  const selectedTagIds = usePermissionsStore((state) => state.selectedTagIds);
  const setSelectedTagIds = usePermissionsStore((state) => state.setSelectedTagIds);

  return <TagSelector selectedTagIds={selectedTagIds} onTagIdsChange={setSelectedTagIds} />;
}
