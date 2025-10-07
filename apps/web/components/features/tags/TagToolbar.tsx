import { Toolbar } from '@/components/common';

import { CreateTagDialog } from './CreateTagDialog';
import { TagLimit } from './TagLimit';
import { TagSearch } from './TagSearch';
import { TagSorter } from './TagSorter';
import { TagViewSwitcher } from './TagViewSwitcher';

export function TagToolbar() {
  const toolbarItems = [
    <TagSearch key="search" />,
    <TagSorter key="sorter" />,
    <TagLimit key="limit" />,
    <TagViewSwitcher key="view" />,
    <CreateTagDialog key="create" />,
  ];

  return <Toolbar items={toolbarItems} />;
}
