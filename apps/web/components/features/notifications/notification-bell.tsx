'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useApolloClient, useMutation } from '@apollo/client/react';
import {
  MarkMyNotificationReadDocument,
  type MarkMyNotificationReadMutation,
  MyNotificationsDocument,
  type MyNotificationsQuery,
  type Notification,
} from '@grantjs/schema';
import { Bell } from 'lucide-react';

import { NotificationListItem } from '@/components/features/notifications/notification-list-item';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { evictNotificationsCache } from '@/hooks/notifications/cache';
import { useUnreadNotificationCount } from '@/hooks/notifications/use-unread-notification-count';
import { Link, useRouter } from '@/i18n/navigation';
import { buildNotificationHref } from '@/lib/notification-href.lib';

const POLL_INTERVAL_MS = 30_000;
const PREVIEW_LIMIT = 5;

function NotificationBellSkeleton() {
  return (
    <ul className="max-h-80 overflow-y-auto" aria-hidden>
      {Array.from({ length: 3 }, (_, index) => (
        <li key={index} className="flex items-start gap-3 px-4 py-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function NotificationBell() {
  const t = useTranslations('notificationBell');
  const router = useRouter();
  const client = useApolloClient();
  const { unreadCount, refetch: refetchCount } = useUnreadNotificationCount(POLL_INTERVAL_MS);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Notification[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [markReadMutation] = useMutation<MarkMyNotificationReadMutation>(
    MarkMyNotificationReadDocument,
    {
      update: (cache) => {
        evictNotificationsCache(cache);
      },
    }
  );

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const result = await client.query<MyNotificationsQuery>({
        query: MyNotificationsDocument,
        variables: { input: { limit: PREVIEW_LIMIT } },
        fetchPolicy: 'network-only',
      });
      setPreview(result.data?.myNotifications?.notifications ?? []);
    } finally {
      setLoadingPreview(false);
    }
  }, [client]);

  useEffect(() => {
    if (open) void loadPreview();
  }, [open, loadPreview]);

  const buildHref = (notification: Notification) =>
    buildNotificationHref({
      refEntity: notification.refEntity ?? null,
      refId: notification.refId ?? null,
      scope: notification.scope ?? null,
    });

  const handleItemClick = async (notification: Notification) => {
    if (!notification.readAt) {
      await markReadMutation({ variables: { id: notification.id } });
      void refetchCount();
    }
    setOpen(false);
    const href = buildHref(notification);
    if (href) router.push(href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label={t('ariaLabel')} className="relative">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">{t('title')}</p>
        </div>
        {loadingPreview ? (
          <NotificationBellSkeleton />
        ) : preview.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-center text-sm">{t('empty')}</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {preview.map((notification) => {
              const href = buildHref(notification);
              return (
                <li key={notification.id}>
                  <NotificationListItem
                    notification={notification}
                    compact
                    onClick={href ? () => void handleItemClick(notification) : undefined}
                  />
                </li>
              );
            })}
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
