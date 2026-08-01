import type { EventType, MutationResolvers, QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const webhookSubscriptionsResolver: QueryResolvers<GraphqlContext>['webhookSubscriptions'] =
  async (_parent, { scope }, context) => {
    return context.handlers.webhookSubscriptions.list(scope);
  };

export const webhookSubscriptionResolver: QueryResolvers<GraphqlContext>['webhookSubscription'] =
  async (_parent, { scope, id }, context) => {
    return context.handlers.webhookSubscriptions.getById(scope, id);
  };

export const webhookDeliveriesResolver: QueryResolvers<GraphqlContext>['webhookDeliveries'] =
  async (_parent, { scope, subscriptionId, status, page, limit }, context) => {
    return context.handlers.webhookSubscriptions.listDeliveries(scope, {
      subscriptionId: subscriptionId ?? undefined,
      status: status ?? undefined,
      page: page ?? undefined,
      limit: limit ?? undefined,
    });
  };

export const createWebhookSubscriptionResolver: MutationResolvers<GraphqlContext>['createWebhookSubscription'] =
  async (_parent, { input }, context) => {
    const { scope, ...rest } = input;
    return context.handlers.webhookSubscriptions.create(scope, {
      url: rest.url,
      eventTypes: rest.eventTypes as EventType[],
      description: rest.description ?? undefined,
      active: rest.active ?? undefined,
    });
  };

export const updateWebhookSubscriptionResolver: MutationResolvers<GraphqlContext>['updateWebhookSubscription'] =
  async (_parent, { id, input }, context) => {
    const { scope, ...rest } = input;
    return context.handlers.webhookSubscriptions.update(scope, id, {
      ...(rest.url != null ? { url: rest.url } : {}),
      ...(rest.eventTypes != null ? { eventTypes: rest.eventTypes as EventType[] } : {}),
      ...(rest.description !== undefined ? { description: rest.description } : {}),
      ...(rest.active != null ? { active: rest.active } : {}),
    });
  };

export const deleteWebhookSubscriptionResolver: MutationResolvers<GraphqlContext>['deleteWebhookSubscription'] =
  async (_parent, { input }, context) => {
    await context.handlers.webhookSubscriptions.delete(input.scope, input.id);
    return true;
  };

export const rotateWebhookSubscriptionSecretResolver: MutationResolvers<GraphqlContext>['rotateWebhookSubscriptionSecret'] =
  async (_parent, { input }, context) => {
    return context.handlers.webhookSubscriptions.rotateSecret(input.scope, input.id);
  };

export const replayWebhookDeliveryResolver: MutationResolvers<GraphqlContext>['replayWebhookDelivery'] =
  async (_parent, { input }, context) => {
    return context.handlers.webhookSubscriptions.replayDelivery(input.scope, input.deliveryId);
  };
