'use client';

import { User, UserSortableField, UserSortOrder } from '@/graphql/generated/types';
import { UserCards } from './UserCards';
import { UserTable } from './UserTable';
import { UserView } from './UserViewSwitcher';

interface UserViewerProps {
  limit: number;
  users: User[];
  loading: boolean;
  search: string;
  view: UserView;
  onEditClick: (user: User) => void;
  onDeleteClick: (user: User) => void;
}

export function UserViewer({ view, ...props }: UserViewerProps) {
  switch (view) {
    case UserView.CARD:
      return <UserCards {...props} />;
    case UserView.TABLE:
    default:
      return <UserTable {...props} />;
  }
}
