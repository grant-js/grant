'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Notification } from '@grantjs/schema';
import { formatDistanceToNow } from 'date-fns';
import { Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { useUnreadNotificationCount } from '@/hooks/notifications/use-unread-notification-count';
import { Link, useRouter } from '@/i18n/navigation';
import { buildNotificationHref } from '@/lib/notification-href.lib';
import { listNotifications, markNotificationRead } from '@/lib/notifications-api.lib';
import { cn } from '@/lib/utils';

const POLL_INTERVAL_MS = 30_000;
const PREVIEW_LIMIT = 5;

export function NotificationBell() {
  const t = useTranslations('notificationBell');
  const router = useRouter();
  const { unreadCount, refetch: refetchCount } = useUnreadNotificationCount(POLL_INTERVAL_MS);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Notification[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const result = await listNotifications({ limit: PREVIEW_LIMIT });
      setPreview(result.notifications);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadPreview();
  }, [open, loadPreview]);

  const handleItemClick = async (notification: Notification) => {
    if (!notification.readAt) {
      await markNotificationRead(notification.id);
      void refetchCount();
    }
    setOpen(false);
    const href = buildNotificationHref({
      refEntity: notification.refEntity,
      refId: notification.refId,
      scope: notification.scope,
    });
    if (href) router.push(href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label={t('ariaLabel')}>
          <span className="relative">
            <Bell className="h-[1.2rem] w-[1.2rem]" />
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">{t('title')}</p>
        </div>
        {loadingPreview ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : preview.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-center text-sm">{t('empty')}</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {preview.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  className={cn(
                    'hover:bg-accent w-full px-4 py-3 text-left transition-colors',
                    !notification.readAt && 'bg-accent/40'
                  )}
                  onClick={() => void handleItemClick(notification)}
                >
                  <p className="text-sm font-medium leading-snug">{notification.title}</p>
                  {notification.body && (
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                      {notification.body}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t px-4 py-2">
          <Link
            href="/dashboard/notifications"
            className="text-primary block text-center text-sm font-medium hover:underline"
            onClick={() => setOpen(false)}
          >
            {t('viewAll')}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
