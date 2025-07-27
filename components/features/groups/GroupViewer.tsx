'use client';

import { Group } from '@/graphql/generated/types';
import { GroupTable } from './GroupTable';
import { GroupCards } from './GroupCards';
import { GroupView } from './GroupViewSwitcher';

interface GroupViewerProps {
  groups: Group[];
  loading: boolean;
  search: string;
  view: GroupView;
  limit: number;
  onEditClick: (group: Group) => void;
  onDeleteClick: (group: Group) => void;
}

export function GroupViewer({
  groups,
  loading,
  search,
  view,
  limit,
  onEditClick,
  onDeleteClick,
}: GroupViewerProps) {
  return view === 'table' ? (
    <GroupTable
      groups={groups}
      loading={loading}
      search={search}
      onEditClick={onEditClick}
      onDeleteClick={onDeleteClick}
    />
  ) : (
    <GroupCards
      groups={groups}
      loading={loading}
      search={search}
      onEditClick={onEditClick}
      onDeleteClick={onDeleteClick}
    />
  );
}
