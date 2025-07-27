import { CreateGroupDialog } from './CreateGroupDialog';
import { GroupSorter } from './GroupSorter';
import { GroupLimit } from './GroupLimit';
import { GroupSearch } from './GroupSearch';
import { GroupViewSwitcher, GroupView } from './GroupViewSwitcher';
import { GroupSortableField, GroupSortOrder, GroupSortInput } from '@/graphql/generated/types';

interface GroupActionsToolbarProps {
  limit: number;
  search: string;
  sort?: GroupSortInput;
  currentView: GroupView;
  onLimitChange: (limit: number) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (field: GroupSortableField, order: GroupSortOrder) => void;
  onViewChange: (view: GroupView) => void;
}

export function GroupActionsToolbar({
  limit,
  search,
  sort,
  currentView,
  onLimitChange,
  onSearchChange,
  onSortChange,
  onViewChange,
}: GroupActionsToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="w-full sm:w-auto">
        <GroupSearch search={search} onSearchChange={onSearchChange} />
      </div>
      <div className="w-full sm:w-auto">
        <GroupSorter sort={sort} onSortChange={onSortChange} />
      </div>
      <div className="w-full sm:w-auto">
        <GroupLimit limit={limit} onLimitChange={onLimitChange} />
      </div>
      <div className="w-full sm:w-auto">
        <GroupViewSwitcher currentView={currentView} onViewChange={onViewChange} />
      </div>
      <div className="w-full sm:w-auto">
        <CreateGroupDialog />
      </div>
    </div>
  );
}
