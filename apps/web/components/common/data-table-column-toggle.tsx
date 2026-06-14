'use client';

import { useTranslations } from 'next-intl';
import { Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface DataTableColumnToggleItem {
  key: string;
  label: string;
  visible: boolean;
}

export interface DataTableColumnToggleProps {
  columns: DataTableColumnToggleItem[];
  onToggle: (key: string, visible: boolean) => void;
  iconOnly?: boolean;
}

export function DataTableColumnToggle({
  columns,
  onToggle,
  iconOnly = true,
}: DataTableColumnToggleProps) {
  const t = useTranslations('common.dataTable');

  if (columns.length === 0) {
    return null;
  }

  const trigger = (
    <Button
      variant="outline"
      size={iconOnly ? 'default' : 'sm'}
      className={iconOnly ? 'size-9 min-w-9 max-w-9 p-2' : 'h-8'}
      aria-label={t('columns')}
    >
      <Settings2 className={iconOnly ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />
      {!iconOnly && t('columns')}
    </Button>
  );

  return (
    <DropdownMenu>
      {iconOnly ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{t('columns')}</TooltipContent>
        </Tooltip>
      ) : (
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      )}
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuLabel>{t('toggleColumns')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            checked={column.visible}
            onCheckedChange={(checked) => onToggle(column.key, checked === true)}
            onSelect={(event) => event.preventDefault()}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
