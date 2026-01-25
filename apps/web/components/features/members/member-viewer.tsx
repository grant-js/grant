'use client';

import { useCallback, useEffect } from 'react';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant } from '@grantjs/schema';

import { useMembers } from '@/hooks/members';
import { useMembersStore } from '@/stores/members.store';

import { MemberCards } from './member-cards';
import { MemberTable } from './member-table';
import { MemberView } from './member-types';

interface MemberViewerProps {
  organizationId: string;
}

export function MemberViewer({ organizationId }: MemberViewerProps) {
  const scope = { tenant: Tenant.Organization, id: organizationId };
  const view = useMembersStore((state) => state.view);
  const search = useMembersStore((state) => state.search);
  const sort = useMembersStore((state) => state.sort);
  const page = useMembersStore((state) => state.page);
  const limit = useMembersStore((state) => state.limit);
  const setMembers = useMembersStore((state) => state.setMembers);
  const setLoading = useMembersStore((state) => state.setLoading);
  const setTotalCount = useMembersStore((state) => state.setTotalCount);
  const setRefetch = useMembersStore((state) => state.setRefetch);

  const { members, loading, totalCount, refetch } = useMembers({
    organizationId,
    page,
    limit,
    search,
    sort,
  });

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setRefetch(handleRefetch);
    return () => setRefetch(null);
  }, [handleRefetch, setRefetch]);

  useEffect(() => {
    setMembers(members);
  }, [members, setMembers]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    setTotalCount(totalCount);
  }, [totalCount, setTotalCount]);

  const canQuery = useGrant(ResourceSlug.OrganizationMember, ResourceAction.Query, {
    scope,
  });

  if (!canQuery) {
    return null;
  }

  switch (view) {
    case MemberView.CARD:
      return <MemberCards />;
    case MemberView.TABLE:
    default:
      return <MemberTable />;
  }
}
