'use client';

import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { useNotifications } from '@/hooks/notifications';
import { Link, useRouter } from '@/i18n/navigation';
import { buildNotificationHref } from '@/lib/notification-href.lib';

const POLL_INTERVAL_MS = 30_000;

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
    const href = buildNotificationHref({
      refEntity: notification.refEntity,
      refId: notification.refId,
      scope: notification.scope,
    });
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
          {unreadCount > 0 && (
            <Badge variant="secondary">{t('unreadBadge', { count: unreadCount })}</Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          {t('markAllRead')}
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error.message}</p>}

      {!loading && !error && notifications.length === 0 && (
        <p className="text-muted-foreground py-6 text-center text-sm">{t('empty')}</p>
      )}

      <ul className="divide-border divide-y">
        {notifications.map((notification) => {
          const href = buildNotificationHref({
            refEntity: notification.refEntity,
            refId: notification.refId,
            scope: notification.scope,
          });
          const RowWrapper = href ? 'button' : 'div';
          return (
            <li key={notification.id}>
              <RowWrapper
                type={href ? 'button' : undefined}
                className={`flex w-full items-start justify-between gap-4 py-3 text-left ${
                  notification.readAt ? 'opacity-60' : ''
                } ${href ? 'hover:bg-accent/50 cursor-pointer rounded-md px-2 -mx-2 transition-colors' : ''}`}
                onClick={href ? () => void handleRowClick(notification) : undefined}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{notification.title}</span>
                    <Badge variant="outline">{notification.category}</Badge>
                  </div>
                  {notification.body && (
                    <p className="text-muted-foreground text-sm">{notification.body}</p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!notification.readAt && (
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
                )}
              </RowWrapper>
            </li>
          );
        })}
      </ul>

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
