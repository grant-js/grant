'use client';

import { useEffect } from 'react';

import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useGroups } from '@/hooks/groups';
import { useGroupsStore } from '@/stores/groups.store';

import { GroupCards } from './GroupCards';
import { GroupTable } from './GroupTable';
import { GroupView } from './GroupViewSwitcher';

export function GroupViewer() {
  const scope = useScopeFromParams();

  // Use selective subscriptions to prevent unnecessary re-renders
  const view = useGroupsStore((state) => state.view);
  const page = useGroupsStore((state) => state.page);
  const limit = useGroupsStore((state) => state.limit);
  const search = useGroupsStore((state) => state.search);
  const sort = useGroupsStore((state) => state.sort);
  const selectedTagIds = useGroupsStore((state) => state.selectedTagIds);
  const setTotalCount = useGroupsStore((state) => state.setTotalCount);
  const setGroups = useGroupsStore((state) => state.setGroups);
  const setLoading = useGroupsStore((state) => state.setLoading);

  // Get groups data from the hook
  const { groups, loading, totalCount } = useGroups({
    scope,
    page,
    limit,
    search,
    sort,
    tagIds: selectedTagIds,
  });

  // Update store with data when it changes
  useEffect(() => {
    setGroups(groups);
  }, [groups, setGroups]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    if (totalCount && totalCount !== 0) {
      setTotalCount(totalCount);
    }
  }, [totalCount, setTotalCount]);

  switch (view) {
    case GroupView.CARDS:
      return <GroupCards />;
    case GroupView.TABLE:
    default:
      return <GroupTable />;
  }
}
