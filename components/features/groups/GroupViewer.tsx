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

export function GroupViewer({ view, ...props }: GroupViewerProps) {
  switch (view) {
    case GroupView.TABLE:
      return <GroupTable {...props} />;
    case GroupView.CARDS:
    default:
      return <GroupCards {...props} />;
  }
}
