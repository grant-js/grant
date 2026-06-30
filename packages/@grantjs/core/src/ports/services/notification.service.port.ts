import type {
  ListNotificationsInput,
  NotificationPage,
  NotificationPreference,
  SetNotificationPreferenceInput,
} from '@grantjs/schema';

/**
 * Read/management API for a user's own in-app notifications and notification
 * preferences. All operations are scoped to the authenticated recipient
 * (application-layer ownership).
 */
export interface INotificationService {
  list(recipientUserId: string, params: ListNotificationsInput): Promise<NotificationPage>;

  unreadCount(recipientUserId: string): Promise<number>;

  markRead(recipientUserId: string, id: string): Promise<void>;

  markAllRead(recipientUserId: string): Promise<number>;

  listPreferences(userId: string, scopeTenant: string): Promise<NotificationPreference[]>;

  setPreference(
    userId: string,
    params: SetNotificationPreferenceInput
  ): Promise<NotificationPreference>;
}
