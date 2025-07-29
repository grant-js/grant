import { Toolbar } from '@/components/common';
import { UserSortableField, UserSortOrder, UserSortInput } from '@/graphql/generated/types';

import { CreateUserDialog } from './CreateUserDialog';
import { UserLimit } from './UserLimit';
import { UserSearch } from './UserSearch';
import { UserSorter } from './UserSorter';
import { UserViewSwitcher, UserView } from './UserViewSwitcher';

interface UserToolbarProps {
  limit: number;
  search: string;
  sort?: UserSortInput;
  currentView: UserView;
  onLimitChange: (limit: number) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (field: UserSortableField, order: UserSortOrder) => void;
  onViewChange: (view: UserView) => void;
}

export function UserToolbar({
  limit,
  search,
  sort,
  currentView,
  onLimitChange,
  onSearchChange,
  onSortChange,
  onViewChange,
}: UserToolbarProps) {
  const toolbarItems = [
    <UserSearch key="search" search={search} onSearchChange={onSearchChange} />,
    <UserSorter key="sorter" sort={sort} onSortChange={onSortChange} />,
    <UserLimit key="limit" limit={limit} onLimitChange={onLimitChange} />,
    <UserViewSwitcher key="view" currentView={currentView} onViewChange={onViewChange} />,
    <CreateUserDialog key="create" />,
  ];

  return <Toolbar items={toolbarItems} />;
}
