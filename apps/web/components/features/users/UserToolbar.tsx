import { Toolbar } from '@/components/common';

import { CreateUserDialog } from './CreateUserDialog';
import { UserLimit } from './UserLimit';
import { UserSearch } from './UserSearch';
import { UserSorter } from './UserSorter';
import { UserTagSelector } from './UserTagSelector';
import { UserViewSwitcher } from './UserViewSwitcher';

export function UserToolbar() {
  const toolbarItems = [
    <UserSearch key="search" />,
    <UserSorter key="sorter" />,
    <UserTagSelector key="tags" />,
    <UserLimit key="limit" />,
    <UserViewSwitcher key="view" />,
    <CreateUserDialog key="create" />,
  ];

  return <Toolbar items={toolbarItems} />;
}
