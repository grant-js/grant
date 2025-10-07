import { Toolbar } from '@/components/common';

import { CreatePermissionDialog } from './CreatePermissionDialog';
import { PermissionLimit } from './PermissionLimit';
import { PermissionSearch } from './PermissionSearch';
import { PermissionSorter } from './PermissionSorter';
import { PermissionTagSelector } from './PermissionTagSelector';
import { PermissionViewSwitcher } from './PermissionViewSwitcher';

export function PermissionToolbar() {
  const toolbarItems = [
    <PermissionSearch key="search" />,
    <PermissionSorter key="sorter" />,
    <PermissionTagSelector key="tags" />,
    <PermissionLimit key="limit" />,
    <PermissionViewSwitcher key="view" />,
    <CreatePermissionDialog key="create" />,
  ];

  return <Toolbar items={toolbarItems} />;
}
