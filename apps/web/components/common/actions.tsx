'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { MoreVertical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';

import { BaseEntity } from './common-types';

export interface ActionItem<TEntity extends BaseEntity> {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: (entity: TEntity) => void;
  variant?: 'default' | 'destructive';
  className?: string;
}

export interface ActionsProps<TEntity extends BaseEntity> {
  entity: TEntity;
  actions: ActionItem<TEntity>[];
  triggerClassName?: string;
  contentClassName?: string;
  align?: 'start' | 'center' | 'end';
  onOpenChange?: (open: boolean) => void;
  /**
   * The menu's actions are not known yet (permissions are checked when the menu first opens).
   * The open menu shows a loading row. The trigger stays enabled whatever this says: it is
   * what starts the permission checks, so disabling or hiding it would deadlock the menu.
   */
  isLoading?: boolean;
}

/**
 * An entity's context menu. The trigger is always there and always enabled; the menu lists
 * the actions the user may take (forbidden ones are left out by the caller), a loading row
 * while they are being checked, and "No actions available" when there are none.
 */
export function Actions<TEntity extends BaseEntity>({
  entity,
  actions,
  triggerClassName,
  contentClassName,
  align = 'end',
  onOpenChange,
  isLoading,
}: ActionsProps<TEntity>) {
  const a11y = useTranslations('common.accessibility');
  const t = useTranslations('common');

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`h-8 w-8 p-0 ${triggerClassName || ''}`}>
          <span className="sr-only">{a11y('openMenu')}</span>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={contentClassName} aria-busy={isLoading}>
        {isLoading ? (
          <DropdownMenuItem disabled data-testid="actions-loading">
            <Spinner className="mr-2 h-4 w-4" />
            {t('loading')}
          </DropdownMenuItem>
        ) : actions.length === 0 ? (
          <DropdownMenuItem disabled data-testid="actions-empty">
            {t('noActionsAvailable')}
          </DropdownMenuItem>
        ) : (
          actions.map((action) => (
            <DropdownMenuItem
              key={action.key}
              onClick={() => action.onClick(entity)}
              className={action.className}
              variant={action.variant}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
