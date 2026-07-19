'use client';

import type { Notification } from '@grantjs/schema';
import { formatDistanceToNow } from 'date-fns';
import type { ReactNode } from 'react';

import { NotificationCategoryAvatar } from '@/components/features/notifications/notification-category-avatar';
import { cn } from '@/lib/utils';

interface NotificationListItemProps {
  notification: Notification;
  onClick?: () => void;
  /** Compact layout for the header popover. */
  compact?: boolean;
  trailing?: ReactNode;
  className?: string;
}

export function NotificationListItem({
  notification,
  onClick,
  compact = false,
  trailing,
  className,
}: NotificationListItemProps) {
  const interactive = Boolean(onClick);

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={cn(
        'flex w-full items-start gap-3 text-left',
        compact ? 'px-4 py-3' : 'py-3',
        interactive && 'hover:bg-accent cursor-pointer transition-colors',
        !notification.readAt && compact && 'bg-accent/40',
        notification.readAt && !compact && 'opacity-60',
        interactive && !compact && 'hover:bg-accent/50 rounded-md px-2 -mx-2',
        className
      )}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <NotificationCategoryAvatar category={notification.category} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{notification.title}</p>
        {notification.body ? (
          <p
            className={cn(
              'text-muted-foreground mt-0.5 leading-snug',
              compact ? 'line-clamp-2 text-xs' : 'text-sm'
            )}
          >
            {notification.body}
          </p>
        ) : null}
        <p className="text-muted-foreground/70 mt-1.5 text-[11px] leading-none">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      {trailing}
    </div>
  );
}
