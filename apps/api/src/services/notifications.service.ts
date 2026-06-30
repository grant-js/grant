import type { INotificationService } from '@grantjs/core';
import type { NotificationModel, NotificationPreferenceModel } from '@grantjs/database';
import type {
  ListNotificationsInput,
  Notification,
  NotificationPage,
  NotificationPreference,
  SetNotificationPreferenceInput,
} from '@grantjs/schema';

import { NotFoundError } from '@/lib/errors';
import type { NotificationPreferenceRepository } from '@/repositories/notification-preferences.repository';
import type { NotificationRepository } from '@/repositories/notifications.repository';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function toNotificationDto(model: NotificationModel): Notification {
  return {
    id: model.id,
    eventId: model.eventId,
    category: model.category,
    type: model.type,
    channel: model.channel,
    title: model.title,
    body: model.body,
    refEntity: model.refEntity,
    refId: model.refId,
    status: model.status,
    seenAt: model.seenAt,
    readAt: model.readAt,
    createdAt: model.createdAt,
  };
}

function toPreferenceDto(model: NotificationPreferenceModel): NotificationPreference {
  return {
    id: model.id,
    scopeTenant: model.scopeTenant,
    scopeId: model.scopeId,
    category: model.category,
    channel: model.channel,
    enabled: model.enabled,
    source: model.source,
  };
}

/**
 * Read/management API for a user's own in-app notifications and notification
 * preferences. All operations are scoped to the authenticated `recipientUserId`
 * (application-layer ownership; these tables carry no RLS policy).
 */
export class NotificationService implements INotificationService {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly preferences: NotificationPreferenceRepository
  ) {}

  async list(recipientUserId: string, params: ListNotificationsInput): Promise<NotificationPage> {
    const limit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const page = Math.max(params.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const [{ rows, totalCount }, unreadCount] = await Promise.all([
      this.notifications.listForRecipient(recipientUserId, {
        unreadOnly: params.unreadOnly,
        offset,
        limit,
      }),
      this.notifications.unreadCount(recipientUserId),
    ]);

    return {
      notifications: rows.map(toNotificationDto),
      totalCount,
      unreadCount,
      hasNextPage: offset + rows.length < totalCount,
    };
  }

  async unreadCount(recipientUserId: string): Promise<number> {
    return this.notifications.unreadCount(recipientUserId);
  }

  async markRead(recipientUserId: string, id: string): Promise<void> {
    const updated = await this.notifications.markRead(recipientUserId, id);
    if (!updated) {
      throw new NotFoundError('Notification not found');
    }
  }

  async markAllRead(recipientUserId: string): Promise<number> {
    return this.notifications.markAllRead(recipientUserId);
  }

  async listPreferences(userId: string, scopeTenant: string): Promise<NotificationPreference[]> {
    const rows = await this.preferences.listForUser(userId, scopeTenant);
    return rows.map(toPreferenceDto);
  }

  async setPreference(
    userId: string,
    params: SetNotificationPreferenceInput
  ): Promise<NotificationPreference> {
    const row = await this.preferences.upsert({
      userId,
      scopeTenant: params.scopeTenant,
      scopeId: params.scopeId ?? '',
      category: params.category,
      channel: params.channel,
      enabled: params.enabled,
      source: 'user',
    });
    return toPreferenceDto(row);
  }
}
