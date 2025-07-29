import { Toolbar } from '@/components/common';
import { RoleSortableField, RoleSortOrder, RoleSortInput } from '@/graphql/generated/types';

import { CreateRoleDialog } from './CreateRoleDialog';
import { RoleLimit } from './RoleLimit';
import { RoleSearch } from './RoleSearch';
import { RoleSorter } from './RoleSorter';
import { RoleViewSwitcher, RoleView } from './RoleViewSwitcher';

interface RoleToolbarProps {
  limit: number;
  search: string;
  sort?: RoleSortInput;
  currentView: RoleView;
  onLimitChange: (limit: number) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (field: RoleSortableField, order: RoleSortOrder) => void;
  onViewChange: (view: RoleView) => void;
}

export function RoleToolbar({
  limit,
  search,
  sort,
  currentView,
  onLimitChange,
  onSearchChange,
  onSortChange,
  onViewChange,
}: RoleToolbarProps) {
  const toolbarItems = [
    <RoleSearch key="search" search={search} onSearchChange={onSearchChange} />,
    <RoleSorter key="sorter" sort={sort} onSortChange={onSortChange} />,
    <RoleLimit key="limit" limit={limit} onLimitChange={onLimitChange} />,
    <RoleViewSwitcher key="view" currentView={currentView} onViewChange={onViewChange} />,
    <CreateRoleDialog key="create" />,
  ];

  return <Toolbar items={toolbarItems} />;
}
