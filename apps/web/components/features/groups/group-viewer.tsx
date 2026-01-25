'use client';

import { useCallback, useEffect } from 'react';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { useScopeFromParams } from '@/hooks/common';
import { useGroups } from '@/hooks/groups';
import { useGroupsStore } from '@/stores/groups.store';

import { GroupCards } from './group-cards';
import { GroupTable } from './group-table';
import { GroupView } from './group-types';

export function GroupViewer() {
  const scope = useScopeFromParams();
  const view = useGroupsStore((state) => state.view);
  const page = useGroupsStore((state) => state.page);
  const limit = useGroupsStore((state) => state.limit);
  const search = useGroupsStore((state) => state.search);
  const sort = useGroupsStore((state) => state.sort);
  const selectedTagIds = useGroupsStore((state) => state.selectedTagIds);
  const setTotalCount = useGroupsStore((state) => state.setTotalCount);
  const setGroups = useGroupsStore((state) => state.setGroups);
  const setLoading = useGroupsStore((state) => state.setLoading);
  const setRefetch = useGroupsStore((state) => state.setRefetch);

  const { groups, loading, totalCount, refetch } = useGroups({
    scope: scope!,
    page,
    limit,
    search,
    sort,
    tagIds: selectedTagIds,
  });

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setRefetch(handleRefetch);
    return () => setRefetch(null);
  }, [handleRefetch, setRefetch]);

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

  const canQuery = useGrant(ResourceSlug.Group, ResourceAction.Query, {
    scope: scope!,
  });

  if (!scope || !canQuery) {
    return null;
  }

  switch (view) {
    case GroupView.CARDS:
      return <GroupCards />;
    case GroupView.TABLE:
    default:
      return <GroupTable />;
  }
}
