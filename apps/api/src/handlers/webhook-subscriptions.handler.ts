import type { ITransactionalConnection, IWebhookSubscriptionService } from '@grantjs/core';
import type {
  CreateWebhookSubscriptionInput,
  Scope,
  UpdateWebhookSubscriptionInput,
  WebhookDeliveryAttempt,
  WebhookSubscription,
  WebhookSubscriptionWithSecret,
} from '@grantjs/schema';
import { Tenant } from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError } from '@/lib/errors';
import { tryProjectIdFromScope } from '@/lib/scope.lib';
import type { Transaction } from '@/lib/transaction-manager.lib';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

const ALLOWED_TENANTS: readonly string[] = [Tenant.AccountProject, Tenant.OrganizationProject];

export class WebhookSubscriptionsHandler extends CacheHandler {
  constructor(
    private readonly webhookSubscriptions: IWebhookSubscriptionService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
  }

  private resolveProjectId(scope: Scope): string {
    if (!ALLOWED_TENANTS.includes(scope.tenant)) {
      throw new BadRequestError(
        `Webhook subscriptions are only available for project scopes, got: ${scope.tenant}`
      );
    }
    const projectId = tryProjectIdFromScope(scope);
    if (!projectId) {
      throw new BadRequestError('Could not resolve project from scope');
    }
    return projectId;
  }

  async list(scope: Scope): Promise<WebhookSubscription[]> {
    const projectId = this.resolveProjectId(scope);
    return this.webhookSubscriptions.list({ scope, projectId });
  }

  async getById(scope: Scope, id: string): Promise<WebhookSubscription> {
    const projectId = this.resolveProjectId(scope);
    return this.webhookSubscriptions.getById({ scope, projectId, id });
  }

  async create(
    scope: Scope,
    input: CreateWebhookSubscriptionInput
  ): Promise<WebhookSubscriptionWithSecret> {
    const projectId = this.resolveProjectId(scope);
    return this.db.withTransaction((tx) =>
      this.webhookSubscriptions.create({ scope, projectId, input }, tx)
    );
  }

  async update(
    scope: Scope,
    id: string,
    input: UpdateWebhookSubscriptionInput
  ): Promise<WebhookSubscription> {
    const projectId = this.resolveProjectId(scope);
    return this.db.withTransaction((tx) =>
      this.webhookSubscriptions.update({ scope, projectId, id, input }, tx)
    );
  }

  async rotateSecret(scope: Scope, id: string): Promise<WebhookSubscriptionWithSecret> {
    const projectId = this.resolveProjectId(scope);
    return this.db.withTransaction((tx) =>
      this.webhookSubscriptions.rotateSecret({ scope, projectId, id }, tx)
    );
  }

  async delete(scope: Scope, id: string): Promise<void> {
    const projectId = this.resolveProjectId(scope);
    await this.db.withTransaction((tx) =>
      this.webhookSubscriptions.delete({ scope, projectId, id }, tx)
    );
  }

  async listDeliveries(
    scope: Scope,
    options: { subscriptionId?: string; status?: string; page?: number; limit?: number }
  ) {
    const projectId = this.resolveProjectId(scope);
    return this.webhookSubscriptions.listDeliveries({ scope, projectId, ...options });
  }

  async replayDelivery(scope: Scope, deliveryId: string): Promise<WebhookDeliveryAttempt> {
    const projectId = this.resolveProjectId(scope);
    return this.db.withTransaction((tx) =>
      this.webhookSubscriptions.replayDelivery({ scope, projectId, deliveryId }, tx)
    );
  }
}
