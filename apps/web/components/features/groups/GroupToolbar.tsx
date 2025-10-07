import { Toolbar } from '@/components/common';

import { CreateGroupDialog } from './CreateGroupDialog';
import { GroupLimit } from './GroupLimit';
import { GroupSearch } from './GroupSearch';
import { GroupSorter } from './GroupSorter';
import { GroupTagSelector } from './GroupTagSelector';
import { GroupViewSwitcher } from './GroupViewSwitcher';

export function GroupToolbar() {
  const toolbarItems = [
    <GroupSearch key="search" />,
    <GroupSorter key="sorter" />,
    <GroupTagSelector key="tags" />,
    <GroupLimit key="limit" />,
    <GroupViewSwitcher key="view" />,
    <CreateGroupDialog key="create" />,
  ];

  return <Toolbar items={toolbarItems} />;
}
