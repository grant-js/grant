import type { EventCategory } from '../events/event-catalog';

export const NOTIFICATION_CHANNELS = ['in_app', 'email'] as const;

export interface ListNotificationsInput {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface SetNotificationPreferenceInput {
  scopeTenant: string;
  scopeId?: string;
  category: EventCategory;
  channel: (typeof NOTIFICATION_CHANNELS)[number];
  enabled: boolean;
}
