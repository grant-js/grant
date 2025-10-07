'use client';

import { ReactNode } from 'react';

import { MoreVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Generic entity interface
export interface BaseEntity {
  id: string;
  [key: string]: any;
}

// Action item configuration
export interface ActionItem<TEntity extends BaseEntity> {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: (entity: TEntity) => void;
  variant?: 'default' | 'destructive';
  className?: string;
}

export interface ActionsProps<TEntity extends BaseEntity> {
  // Entity data
  entity: TEntity;

  // Actions configuration
  actions: ActionItem<TEntity>[];

  // Optional customizations
  triggerClassName?: string;
  contentClassName?: string;
  align?: 'start' | 'center' | 'end';
}

export function Actions<TEntity extends BaseEntity>({
  entity,
  actions,
  triggerClassName,
  contentClassName,
  align = 'end',
}: ActionsProps<TEntity>) {
  const a11y = useTranslations('common.accessibility');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`h-8 w-8 p-0 ${triggerClassName || ''}`}>
          <span className="sr-only">{a11y('openMenu')}</span>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={contentClassName}>
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.key}
            onClick={() => action.onClick(entity)}
            className={action.className}
            variant={action.variant}
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
