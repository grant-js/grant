'use client';

import { useEffect } from 'react';

import { useMembers } from '@/hooks/members';
import { useMembersStore } from '@/stores/members.store';

import { MemberCards } from './MemberCards';
import { MemberTable } from './MemberTable';
import { MemberView } from './MemberViewSwitcher';

interface MemberViewerProps {
  organizationId: string;
}

export function MemberViewer({ organizationId }: MemberViewerProps) {
  const view = useMembersStore((state) => state.view);
  const search = useMembersStore((state) => state.search);
  const sort = useMembersStore((state) => state.sort);
  const page = useMembersStore((state) => state.page);
  const limit = useMembersStore((state) => state.limit);
  const setMembers = useMembersStore((state) => state.setMembers);
  const setLoading = useMembersStore((state) => state.setLoading);
  const setTotalCount = useMembersStore((state) => state.setTotalCount);

  const { members, loading, totalCount } = useMembers({
    organizationId,
    page,
    limit,
    search,
    sort,
  });

  useEffect(() => {
    setMembers(members);
  }, [members, setMembers]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    setTotalCount(totalCount);
  }, [totalCount, setTotalCount]);

  switch (view) {
    case MemberView.CARD:
      return <MemberCards />;
    case MemberView.TABLE:
    default:
      return <MemberTable />;
  }
}
