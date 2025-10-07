'use client';

import { Tags } from '@/components/common';
import { usePermissionsStore } from '@/stores/permissions.store';

export function PermissionTagSelector() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const selectedTagIds = usePermissionsStore((state) => state.selectedTagIds);
  const setSelectedTagIds = usePermissionsStore((state) => state.setSelectedTagIds);

  return <Tags selectedTagIds={selectedTagIds} onTagIdsChange={setSelectedTagIds} />;
}
