import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserSortOrder, UserSortableField } from '@/graphql/generated/types';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react';

interface UserSorterProps {
  currentSort?: {
    field: UserSortableField;
    order: UserSortOrder;
  };
  onSortChange: (field: UserSortableField, order: UserSortOrder) => void;
}

export function UserSorter({ currentSort, onSortChange }: UserSorterProps) {
  const t = useTranslations('users');

  const getSortLabel = (field: UserSortableField) => {
    switch (field) {
      case UserSortableField.Name:
        return t('sort.name');
      case UserSortableField.Email:
        return t('sort.email');
      default:
        return field;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {currentSort ? (
            <>
              {getSortLabel(currentSort.field)}
              {currentSort.order === UserSortOrder.Asc ? (
                <ArrowUp className="size-4" />
              ) : (
                <ArrowDown className="size-4" />
              )}
            </>
          ) : (
            t('sort.label')
          )}
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="px-3 py-1.5 text-sm font-medium">
          {t('sort.label')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.values(UserSortableField).map((field) => (
          <DropdownMenuItem
            key={field}
            className="flex items-center justify-between px-3 py-1.5 text-sm"
            onClick={() => {
              const newOrder =
                currentSort?.field === field && currentSort.order === UserSortOrder.Asc
                  ? UserSortOrder.Desc
                  : UserSortOrder.Asc;
              onSortChange(field, newOrder);
            }}
          >
            <span>{getSortLabel(field)}</span>
            {currentSort?.field === field &&
              (currentSort.order === UserSortOrder.Asc ? (
                <ArrowUp className="size-4" />
              ) : (
                <ArrowDown className="size-4" />
              ))}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
