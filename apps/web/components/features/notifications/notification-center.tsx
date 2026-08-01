'use client';

import { useTranslations } from 'next-intl';
import { Check, CheckCheck } from 'lucide-react';

import { NotificationListItem } from '@/components/features/notifications/notification-list-item';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { useNotifications } from '@/hooks/notifications';
import { Link, useRouter } from '@/i18n/navigation';
import { buildNotificationHref } from '@/lib/notification-href.lib';

const POLL_INTERVAL_MS = 30_000;
const LIST_SKELETON_COUNT = 5;

function NotificationListSkeleton() {
  return (
    <ul className="divide-border divide-y" aria-hidden>
      {Array.from({ length: LIST_SKELETON_COUNT }, (_, index) => (
        <li key={index} className="flex items-start gap-3 py-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-3/4 max-w-sm" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="mt-0.5 size-8 shrink-0 rounded-md" />
        </li>
      ))}
    </ul>
  );
}

export function NotificationCenter() {
  const t = useTranslations('notifications');
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    error,
    hasNextPage,
    markRead,
    markAllRead,
    loadMore,
  } = useNotifications({
    limit: 20,
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  const buildHref = (notification: (typeof notifications)[number]) =>
    buildNotificationHref({
      refEntity: notification.refEntity,
      refId: notification.refId,
      scope: notification.scope,
    });

  const handleMarkRead = async (id: string) => {
    try {
      await markRead(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errors.markRead'));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      toast.success(t('markAllSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errors.markAllRead'));
    }
  };

  const handleRowClick = async (notification: (typeof notifications)[number]) => {
    const href = buildHref(notification);
    if (!notification.readAt) {
      await handleMarkRead(notification.id);
    }
    if (href) router.push(href);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          {loading ? (
            <Skeleton className="h-5 w-16 rounded-full" />
          ) : unreadCount > 0 ? (
            <Badge variant="secondary">{t('unreadBadge', { count: unreadCount })}</Badge>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllRead}
          disabled={loading || unreadCount === 0}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          {t('markAllRead')}
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error.message}</p>}

      {loading ? <NotificationListSkeleton /> : null}

      {!loading && !error && notifications.length === 0 && (
        <p className="text-muted-foreground py-6 text-center text-sm">{t('empty')}</p>
      )}

      {!loading && (
        <ul className="divide-border divide-y">
          {notifications.map((notification) => {
            const href = buildHref(notification);
            return (
              <li key={notification.id}>
                <NotificationListItem
                  notification={notification}
                  onClick={href ? () => void handleRowClick(notification) : undefined}
                  trailing={
                    !notification.readAt ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleMarkRead(notification.id);
                        }}
                        aria-label={t('markRead')}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    ) : null
                  }
                />
              </li>
            );
          })}
        </ul>
      )}

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {t('loadMore')}
          </Button>
        </div>
      )}

      <p className="text-muted-foreground text-sm">
        {t('preferencesHint')}{' '}
        <Link href="/dashboard/settings/notifications" className="text-primary hover:underline">
          {t('preferencesLink')}
        </Link>
      </p>
    </div>
  );
}
