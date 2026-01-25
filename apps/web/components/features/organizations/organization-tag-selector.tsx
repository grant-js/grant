'use client';

import { TagSelector } from '@/components/common';
import { useOrganizationsStore } from '@/stores/organizations.store';

export function OrganizationTagSelector() {
  const selectedTagIds = useOrganizationsStore((state) => state.selectedTagIds);
  const setSelectedTagIds = useOrganizationsStore((state) => state.setSelectedTagIds);

  return <TagSelector selectedTagIds={selectedTagIds} onTagIdsChange={setSelectedTagIds} />;
}
