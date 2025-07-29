'use client';

import { ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type SortOrder = 'ASC' | 'DESC';

export interface SortInput<T extends string> {
  field: T;
  order: SortOrder;
}

export interface SortableFieldConfig<T extends string> {
  value: T;
  label: string;
}

export interface SorterProps<T extends string> {
  sort?: SortInput<T>;
  onSortChange: (field: T, order: SortOrder) => void;
  fields: SortableFieldConfig<T>[];
  defaultField: T;
  translationNamespace: string;
  showLabel?: boolean;
}

export function Sorter<T extends string>({
  sort,
  onSortChange,
  fields,
  defaultField,
  translationNamespace,
  showLabel = true,
}: SorterProps<T>) {
  const t = useTranslations(translationNamespace);

  // If no sort is provided, use default field ASC as default
  const currentSort = sort || { field: defaultField, order: 'ASC' as SortOrder };

  const getSortLabel = (field: T) => {
    const fieldConfig = fields.find((f) => f.value === field);
    return fieldConfig?.label || field;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" className="w-full sm:w-auto">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {t('sort.label')}:{' '}
              <>
                {getSortLabel(currentSort.field)}
                {currentSort.order === 'ASC' ? (
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
        {showLabel && (
          <>
            <DropdownMenuLabel className="px-3 py-1.5 text-sm font-medium">
              {t('sort.label')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        {fields.map((field) => (
          <DropdownMenuItem
            key={field.value}
            className="flex items-center justify-between px-3 py-1.5 text-sm"
            onClick={() => {
              const newOrder =
                currentSort.field === field.value && currentSort.order === 'ASC' ? 'DESC' : 'ASC';
              onSortChange(field.value, newOrder);
            }}
          >
            <span>{field.label}</span>
            {currentSort.field === field.value &&
              (currentSort.order === 'ASC' ? (
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
