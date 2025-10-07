'use client';

import { Tags } from '@/components/common';
import { useOrganizationsStore } from '@/stores/organizations.store';

export function OrganizationTagSelector() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const selectedTagIds = useOrganizationsStore((state) => state.selectedTagIds);
  const setSelectedTagIds = useOrganizationsStore((state) => state.setSelectedTagIds);

  return <Tags selectedTagIds={selectedTagIds} onTagIdsChange={setSelectedTagIds} />;
}
