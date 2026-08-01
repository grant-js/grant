import { randomBytes } from 'node:crypto';

import type {
  IWebhookDeliveryAdapter,
  IWebhookSubscriptionService,
  ListWebhookDeliveriesParams,
  ListWebhookSubscriptionsParams,
  WebhookDeliveryPage,
} from '@grantjs/core';
import type {
  CreateWebhookSubscriptionInput,
  Scope,
  UpdateWebhookSubscriptionInput,
  WebhookDeliveryAttempt,
  WebhookSubscription,
  WebhookSubscriptionWithSecret,
} from '@grantjs/schema';
import { SsrfBlockedError } from '@grantjs/webhooks';

import { config } from '@/config';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { tryProjectIdFromScope } from '@/lib/project-id-from-scope.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import {
  toWebhookDeliveryAttempt,
  WebhookDeliveryRepository,
} from '@/repositories/webhook-deliveries.repository';
import {
  toWebhookSubscription,
  WebhookSubscriptionRepository,
} from '@/repositories/webhook-subscriptions.repository';

import { validateInput } from './common';
import {
  createWebhookSubscriptionSchema,
  updateWebhookSubscriptionSchema,
} from './webhook-subscriptions.schemas';

const DEFAULT_DELIVERY_PAGE_SIZE = 25;
const MAX_DELIVERY_PAGE_SIZE = 100;

export class WebhookSubscriptionService implements IWebhookSubscriptionService {
  constructor(
    private readonly subscriptions: WebhookSubscriptionRepository,
    private readonly deliveries: WebhookDeliveryRepository,
    private readonly delivery: IWebhookDeliveryAdapter,
    private readonly createdById: string | null
  ) {}

  private resolveProjectId(scope: Scope, providedProjectId: string): string {
    const derived = tryProjectIdFromScope(scope);
    if (!derived) {
      throw new ValidationError('Webhook subscriptions require a project-scoped context');
    }
    if (derived !== providedProjectId) {
      throw new ValidationError('Project does not match the request scope');
    }
    return derived;
  }

  private generateSecret(): string {
    return randomBytes(config.webhooks.secretBytes).toString('base64url');
  }

  private async validateSubscriptionUrl(url: string): Promise<void> {
    try {
      await this.delivery.validateUrl(url);
    } catch (error: unknown) {
      if (error instanceof SsrfBlockedError) {
        throw new ValidationError(error.message);
      }
      throw error;
    }
  }

  async list(
    params: ListWebhookSubscriptionsParams,
    transaction?: Transaction
  ): Promise<WebhookSubscription[]> {
    const projectId = this.resolveProjectId(params.scope, params.projectId);
    const rows = await this.subscriptions.listByProject(projectId, transaction);
    return rows.map(toWebhookSubscription);
  }

  async getById(
    params: { scope: Scope; projectId: string; id: string },
    transaction?: Transaction
  ): Promise<WebhookSubscription> {
    const projectId = this.resolveProjectId(params.scope, params.projectId);
    const row = await this.subscriptions.getById(projectId, params.id, transaction);
    if (!row) {
      throw new NotFoundError(`Webhook subscription ${params.id} not found`);
    }
    return toWebhookSubscription(row);
  }

  async create(
    params: { scope: Scope; projectId: string; input: CreateWebhookSubscriptionInput },
    transaction?: Transaction
  ): Promise<WebhookSubscriptionWithSecret> {
    const projectId = this.resolveProjectId(params.scope, params.projectId);
    const input = validateInput(
      createWebhookSubscriptionSchema,
      params.input,
      'WebhookSubscriptionService.create'
    );

    await this.validateSubscriptionUrl(input.url);

    const secret = this.generateSecret();
    const row = await this.subscriptions.insert(
      {
        projectId,
        scopeTenant: params.scope.tenant,
        scopeId: params.scope.id,
        url: input.url,
        secretRef: secret,
        eventTypes: input.eventTypes,
        active: input.active ?? true,
        description: input.description ?? null,
        createdById: this.createdById,
      },
      transaction
    );

    return { ...toWebhookSubscription(row), secret } as WebhookSubscriptionWithSecret;
  }

  async update(
    params: {
      scope: Scope;
      projectId: string;
      id: string;
      input: UpdateWebhookSubscriptionInput;
    },
    transaction?: Transaction
  ): Promise<WebhookSubscription> {
    const projectId = this.resolveProjectId(params.scope, params.projectId);
    const input = validateInput(
      updateWebhookSubscriptionSchema,
      params.input,
      'WebhookSubscriptionService.update'
    );

    if (input.url) {
      await this.validateSubscriptionUrl(input.url);
    }

    const updated = await this.subscriptions.update(
      projectId,
      params.id,
      {
        ...(input.url !== undefined ? { url: input.url } : {}),
        ...(input.eventTypes !== undefined ? { eventTypes: input.eventTypes } : {}),
        ...(input.description !== undefined ? { description: input.description ?? null } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
      transaction
    );
    if (!updated) {
      throw new NotFoundError(`Webhook subscription ${params.id} not found`);
    }
    return toWebhookSubscription(updated);
  }

  async rotateSecret(
    params: { scope: Scope; projectId: string; id: string },
    transaction?: Transaction
  ): Promise<WebhookSubscriptionWithSecret> {
    const projectId = this.resolveProjectId(params.scope, params.projectId);
    const secret = this.generateSecret();
    const updated = await this.subscriptions.update(
      projectId,
      params.id,
      { secretRef: secret },
      transaction
    );
    if (!updated) {
      throw new NotFoundError(`Webhook subscription ${params.id} not found`);
    }
    return { ...toWebhookSubscription(updated), secret } as WebhookSubscriptionWithSecret;
  }

  async delete(
    params: { scope: Scope; projectId: string; id: string },
    transaction?: Transaction
  ): Promise<void> {
    const projectId = this.resolveProjectId(params.scope, params.projectId);
    const deleted = await this.subscriptions.softDelete(projectId, params.id, transaction);
    if (!deleted) {
      throw new NotFoundError(`Webhook subscription ${params.id} not found`);
    }
  }

  async listDeliveries(
    params: ListWebhookDeliveriesParams,
    transaction?: Transaction
  ): Promise<WebhookDeliveryPage> {
    const projectId = this.resolveProjectId(params.scope, params.projectId);
    const limit = Math.min(params.limit ?? DEFAULT_DELIVERY_PAGE_SIZE, MAX_DELIVERY_PAGE_SIZE);
    const page = Math.max(params.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const { rows, totalCount } = await this.deliveries.listForProject(
      projectId,
      { subscriptionId: params.subscriptionId, status: params.status, offset, limit },
      transaction
    );

    return {
      items: rows.map(toWebhookDeliveryAttempt),
      totalCount,
      hasNextPage: offset + rows.length < totalCount,
    };
  }

  async replayDelivery(
    params: { scope: Scope; projectId: string; deliveryId: string },
    transaction?: Transaction
  ): Promise<WebhookDeliveryAttempt> {
    const projectId = this.resolveProjectId(params.scope, params.projectId);
    const existing = await this.deliveries.getByIdForProject(
      params.deliveryId,
      projectId,
      transaction
    );
    if (!existing) {
      throw new NotFoundError(`Webhook delivery ${params.deliveryId} not found`);
    }
    const reset = await this.deliveries.resetForReplay(params.deliveryId, transaction);
    if (!reset) {
      throw new NotFoundError(`Webhook delivery ${params.deliveryId} not found`);
    }
    return toWebhookDeliveryAttempt(reset);
  }
}
