import { Toolbar } from '@/components/common';

import { CreateRoleDialog } from './CreateRoleDialog';
import { RoleLimit } from './RoleLimit';
import { RoleSearch } from './RoleSearch';
import { RoleSorter } from './RoleSorter';
import { RoleTagSelector } from './RoleTagSelector';
import { RoleViewSwitcher } from './RoleViewSwitcher';

export function RoleToolbar() {
  const toolbarItems = [
    <RoleSearch key="search" />,
    <RoleSorter key="sorter" />,
    <RoleTagSelector key="tags" />,
    <RoleLimit key="limit" />,
    <RoleViewSwitcher key="view" />,
    <CreateRoleDialog key="create" />,
  ];

  return <Toolbar items={toolbarItems} />;
}
