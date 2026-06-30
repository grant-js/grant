import {
  type DbSchema,
  type NewWebhookSubscriptionModel,
  type WebhookSubscriptionModel,
  webhookSubscriptions,
} from '@grantjs/database';
import type { WebhookSubscription } from '@grantjs/schema';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';

export function toWebhookSubscription(row: WebhookSubscriptionModel): WebhookSubscription {
  return {
    id: row.id,
    projectId: row.projectId,
    url: row.url,
    eventTypes: row.eventTypes,
    orderingMode: row.orderingMode,
    active: row.active,
    description: row.description ?? null,
    createdById: row.createdById ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class WebhookSubscriptionRepository {
  constructor(private readonly db: DbSchema) {}

  public async insert(
    values: NewWebhookSubscriptionModel,
    transaction?: Transaction
  ): Promise<WebhookSubscriptionModel> {
    const dbInstance = transaction ?? this.db;
    const [row] = await dbInstance.insert(webhookSubscriptions).values(values).returning();
    return row;
  }

  public async getById(
    projectId: string,
    id: string,
    transaction?: Transaction
  ): Promise<WebhookSubscriptionModel | null> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select()
      .from(webhookSubscriptions)
      .where(
        and(
          eq(webhookSubscriptions.id, id),
          eq(webhookSubscriptions.projectId, projectId),
          isNull(webhookSubscriptions.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /** Unscoped lookup for the system delivery job (carries the signing secret). */
  public async getByIdUnscoped(
    id: string,
    transaction?: Transaction
  ): Promise<WebhookSubscriptionModel | null> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select()
      .from(webhookSubscriptions)
      .where(eq(webhookSubscriptions.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Unscoped batch lookup for the system delivery job. */
  public async getManyUnscoped(
    ids: string[],
    transaction?: Transaction
  ): Promise<WebhookSubscriptionModel[]> {
    if (ids.length === 0) return [];
    const dbInstance = transaction ?? this.db;
    return dbInstance
      .select()
      .from(webhookSubscriptions)
      .where(inArray(webhookSubscriptions.id, ids));
  }

  public async listByProject(
    projectId: string,
    transaction?: Transaction
  ): Promise<WebhookSubscriptionModel[]> {
    const dbInstance = transaction ?? this.db;
    return dbInstance
      .select()
      .from(webhookSubscriptions)
      .where(
        and(eq(webhookSubscriptions.projectId, projectId), isNull(webhookSubscriptions.deletedAt))
      )
      .orderBy(webhookSubscriptions.createdAt);
  }

  /** Active, non-deleted subscriptions in a project subscribed to `eventType`. */
  public async findActiveMatching(
    projectId: string,
    eventType: string,
    transaction?: Transaction
  ): Promise<WebhookSubscriptionModel[]> {
    const dbInstance = transaction ?? this.db;
    return dbInstance
      .select()
      .from(webhookSubscriptions)
      .where(
        and(
          eq(webhookSubscriptions.projectId, projectId),
          eq(webhookSubscriptions.active, true),
          isNull(webhookSubscriptions.deletedAt),
          sql`${webhookSubscriptions.eventTypes} @> ARRAY[${eventType}]::text[]`
        )
      );
  }

  public async update(
    projectId: string,
    id: string,
    fields: Partial<NewWebhookSubscriptionModel>,
    transaction?: Transaction
  ): Promise<WebhookSubscriptionModel | null> {
    const dbInstance = transaction ?? this.db;
    const [row] = await dbInstance
      .update(webhookSubscriptions)
      .set({ ...fields, updatedAt: new Date() })
      .where(
        and(
          eq(webhookSubscriptions.id, id),
          eq(webhookSubscriptions.projectId, projectId),
          isNull(webhookSubscriptions.deletedAt)
        )
      )
      .returning();
    return row ?? null;
  }

  public async softDelete(
    projectId: string,
    id: string,
    transaction?: Transaction
  ): Promise<boolean> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .update(webhookSubscriptions)
      .set({ deletedAt: new Date(), active: false, updatedAt: new Date() })
      .where(
        and(
          eq(webhookSubscriptions.id, id),
          eq(webhookSubscriptions.projectId, projectId),
          isNull(webhookSubscriptions.deletedAt)
        )
      )
      .returning({ id: webhookSubscriptions.id });
    return rows.length > 0;
  }
}
