'use client';

import { SortOrder } from '@grantjs/schema';
import { ArrowUp, ArrowDown, ChevronDown, ArrowUpDown } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

  const currentSort = sort || { field: defaultField, order: SortOrder.Asc };

  const getSortLabel = (field: T) => {
    const fieldConfig = fields.find((f) => f.value === field);
    return fieldConfig?.label || field;
  };

  const sortLabel = getSortLabel(currentSort.field);
  const sortOrderLabel = currentSort.order === SortOrder.Asc ? '↑' : '↓';
  const tooltipText = `${t('sort.label')}: ${sortLabel} ${sortOrderLabel}`;

  const buttonContent = (
    <Button
      variant="outline"
      size="default"
      className="w-full sm:w-auto sm:aspect-square sm:p-2 min-[1600px]:aspect-auto min-[1600px]:px-4 min-[1600px]:py-2"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="size-4 shrink-0 min-[1600px]:hidden" />
          <span className="sm:hidden min-[1600px]:inline">{t('sort.label')}: </span>
          <span className="sm:hidden min-[1600px]:inline">{sortLabel}</span>
          {currentSort.order === SortOrder.Asc ? (
            <ArrowUp className="size-4 shrink-0 sm:hidden min-[1600px]:inline" />
          ) : (
            <ArrowDown className="size-4 shrink-0 sm:hidden min-[1600px]:inline" />
          )}
        </div>
        <ChevronDown className="size-4 max-[1600px]:hidden" />
      </div>
    </Button>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{buttonContent}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">{tooltipText}</TooltipContent>
          <DropdownMenuContent align="end" className="w-48" fullWidthOnMobile>
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
                    currentSort.field === field.value && currentSort.order === SortOrder.Asc
                      ? SortOrder.Desc
                      : SortOrder.Asc;
                  onSortChange(field.value, newOrder);
                }}
              >
                <span>{field.label}</span>
                {currentSort.field === field.value &&
                  (currentSort.order === SortOrder.Asc ? (
                    <ArrowUp className="size-4" />
                  ) : (
                    <ArrowDown className="size-4" />
                  ))}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </Tooltip>
    </TooltipProvider>
  );
}
