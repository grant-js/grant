import { CreateUserDialog } from './CreateUserDialog';
import { UserSorter } from './UserSorter';
import { UserSortableField, UserSortOrder } from '@/graphql/generated/types';

interface UserActionsProps {
  currentPage: number;
  currentSort?: {
    field: UserSortableField;
    order: UserSortOrder;
  };
  onSortChange: (field: UserSortableField, order: UserSortOrder) => void;
}

export function UserActions({ currentPage, currentSort, onSortChange }: UserActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <UserSorter currentSort={currentSort} onSortChange={onSortChange} />
      <CreateUserDialog currentPage={currentPage} />
      {/* Add more user actions here as needed */}
    </div>
  );
}
