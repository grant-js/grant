import {
  type DbSchema,
  type NewNotificationPreferenceModel,
  type NotificationChannel,
  type NotificationPreferenceModel,
  notificationPreferences,
} from '@grantjs/database';
import { and, eq, inArray } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';

export class NotificationPreferenceRepository {
  constructor(private readonly db: DbSchema) {}

  public async listForUser(
    userId: string,
    scopeTenant: string,
    transaction?: Transaction
  ): Promise<NotificationPreferenceModel[]> {
    const dbInstance = transaction ?? this.db;
    return dbInstance
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.scopeTenant, scopeTenant)
        )
      );
  }

  /** Preference rows for one user/category/channel across the given scope ids. */
  public async getForResolution(
    userId: string,
    scopeTenant: string,
    scopeIds: string[],
    category: string,
    channel: NotificationChannel,
    transaction?: Transaction
  ): Promise<NotificationPreferenceModel[]> {
    const dbInstance = transaction ?? this.db;
    return dbInstance
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.scopeTenant, scopeTenant),
          inArray(notificationPreferences.scopeId, scopeIds),
          eq(notificationPreferences.category, category),
          eq(notificationPreferences.channel, channel)
        )
      );
  }

  public async upsert(
    values: NewNotificationPreferenceModel,
    transaction?: Transaction
  ): Promise<NotificationPreferenceModel> {
    const dbInstance = transaction ?? this.db;
    const [row] = await dbInstance
      .insert(notificationPreferences)
      .values(values)
      .onConflictDoUpdate({
        target: [
          notificationPreferences.userId,
          notificationPreferences.scopeTenant,
          notificationPreferences.scopeId,
          notificationPreferences.category,
          notificationPreferences.channel,
        ],
        set: { enabled: values.enabled, source: values.source, updatedAt: new Date() },
      })
      .returning();
    return row;
  }
}
