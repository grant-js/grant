import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserSortOrder, UserSortableField, UserSortInput } from '@/graphql/generated/types';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react';

interface UserSorterProps {
  sort?: UserSortInput;
  onSortChange: (field: UserSortableField, order: UserSortOrder) => void;
}

export function UserSorter({ sort, onSortChange }: UserSorterProps) {
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

  // If no sort is provided, use name ASC as default
  const currentSort = sort || { field: UserSortableField.Name, order: UserSortOrder.Asc };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" className="w-full sm:w-auto">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {t('sort.label')}:{' '}
              <>
                {getSortLabel(currentSort.field)}
                {currentSort.order === UserSortOrder.Asc ? (
                  <ArrowUp className="size-4" />
                ) : (
                  <ArrowDown className="size-4" />
                )}
              </>
            </div>
            <ChevronDown className="size-4" />
          </div>
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
                currentSort.field === field && currentSort.order === UserSortOrder.Asc
                  ? UserSortOrder.Desc
                  : UserSortOrder.Asc;
              onSortChange(field, newOrder);
            }}
          >
            <span>{getSortLabel(field)}</span>
            {currentSort.field === field &&
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
