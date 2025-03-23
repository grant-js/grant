import { CreateUserDialog } from './CreateUserDialog';
import { UserSorter } from './UserSorter';
import { UserLimit } from './UserLimit';
import { UserSearch } from './UserSearch';
import { UserSortableField, UserSortOrder, UserSortInput } from '@/graphql/generated/types';

interface UserActionsProps {
  limit: number;
  search: string;
  sort?: UserSortInput;
  onSortChange: (field: UserSortableField, order: UserSortOrder) => void;
  onLimitChange: (limit: number) => void;
  onSearchChange: (search: string) => void;
}

export function UserActions({
  limit,
  search,
  sort,
  onSortChange,
  onLimitChange,
  onSearchChange,
}: UserActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <UserSearch search={search} onSearchChange={onSearchChange} />
      <UserLimit limit={limit} onLimitChange={onLimitChange} />
      <UserSorter sort={sort} onSortChange={onSortChange} />
      <CreateUserDialog />
    </div>
  );
}
