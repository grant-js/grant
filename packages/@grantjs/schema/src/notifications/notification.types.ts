import type { EventCategory } from '../events/event-catalog';

export const NOTIFICATION_CHANNELS = ['in_app', 'email'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ['pending', 'delivered', 'failed', 'dead'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const NOTIFICATION_PREFERENCE_SOURCES = ['user', 'org_enforced'] as const;
export type NotificationPreferenceSource = (typeof NOTIFICATION_PREFERENCE_SOURCES)[number];

/** Public representation of an in-app notification. */
export interface Notification {
  id: string;
  eventId: string;
  category: string;
  type: string;
  channel: NotificationChannel;
  title: string;
  body: string | null;
  refEntity: string | null;
  refId: string | null;
  status: NotificationStatus;
  seenAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationPage {
  notifications: Notification[];
  totalCount: number;
  unreadCount: number;
  hasNextPage: boolean;
}

export interface NotificationPreference {
  id: string;
  scopeTenant: string;
  scopeId: string;
  category: string;
  channel: NotificationChannel;
  enabled: boolean;
  source: NotificationPreferenceSource;
}

export interface ListNotificationsInput {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface SetNotificationPreferenceInput {
  scopeTenant: string;
  scopeId?: string;
  category: EventCategory;
  channel: NotificationChannel;
  enabled: boolean;
}
