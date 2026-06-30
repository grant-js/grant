'use client';

import { Check, CheckCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { useNotifications } from '@/hooks/notifications';

const POLL_INTERVAL_MS = 30_000;

export function NotificationCenter() {
  const { notifications, unreadCount, loading, error, markRead, markAllRead } = useNotifications({
    limit: 20,
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  const handleMarkRead = async (id: string) => {
    try {
      await markRead(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark all as read');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Notifications</h2>
          {unreadCount > 0 && <Badge variant="secondary">{unreadCount} unread</Badge>}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark all read
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error.message}</p>}

      {!loading && !error && notifications.length === 0 && (
        <p className="text-muted-foreground py-6 text-center text-sm">No notifications yet.</p>
      )}

      <ul className="divide-border divide-y">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={`flex items-start justify-between gap-4 py-3 ${
              notification.readAt ? 'opacity-60' : ''
            }`}
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
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
            {!notification.readAt && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMarkRead(notification.id)}
                aria-label="Mark as read"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
