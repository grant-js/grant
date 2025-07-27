'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { GroupSortableField, GroupSortOrder, GroupSortInput } from '@/graphql/generated/types';

interface GroupSorterProps {
  sort?: GroupSortInput;
  onSortChange: (field: GroupSortableField, order: GroupSortOrder) => void;
}

export function GroupSorter({ sort, onSortChange }: GroupSorterProps) {
  const t = useTranslations('groups');

  const getSortLabel = (field: GroupSortableField) => {
    switch (field) {
      case GroupSortableField.Name:
        return t('sort.name');
      default:
        return field;
    }
  };

  // If no sort is provided, use name ASC as default
  const currentSort = sort || { field: GroupSortableField.Name, order: GroupSortOrder.Asc };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" className="w-full sm:w-auto">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {t('sort.label')}:{' '}
              <>
                {getSortLabel(currentSort.field)}
                {currentSort.order === GroupSortOrder.Asc ? (
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
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="flex items-center justify-between px-3 py-1.5 text-sm"
          onClick={() => {
            const newOrder =
              currentSort.field === GroupSortableField.Name &&
              currentSort.order === GroupSortOrder.Asc
                ? GroupSortOrder.Desc
                : GroupSortOrder.Asc;
            onSortChange(GroupSortableField.Name, newOrder);
          }}
        >
          <span>{getSortLabel(GroupSortableField.Name)}</span>
          {currentSort.field === GroupSortableField.Name &&
            (currentSort.order === GroupSortOrder.Asc ? (
              <ArrowUp className="size-4" />
            ) : (
              <ArrowDown className="size-4" />
            ))}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
