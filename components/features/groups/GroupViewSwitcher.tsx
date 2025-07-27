'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutGrid, Table } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type GroupView = 'cards' | 'table';

interface GroupViewSwitcherProps {
  currentView: GroupView;
  onViewChange: (view: GroupView) => void;
}

export function GroupViewSwitcher({ currentView, onViewChange }: GroupViewSwitcherProps) {
  const t = useTranslations('groups');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" className="w-full sm:w-auto">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {currentView === 'cards' ? (
                <>
                  <LayoutGrid className="size-4" />
                  {t('view.cards')}
                </>
              ) : (
                <>
                  <Table className="size-4" />
                  {t('view.table')}
                </>
              )}
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewChange('cards')}>
          <LayoutGrid className="mr-2 size-4" />
          {t('view.cards')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onViewChange('table')}>
          <Table className="mr-2 size-4" />
          {t('view.table')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
