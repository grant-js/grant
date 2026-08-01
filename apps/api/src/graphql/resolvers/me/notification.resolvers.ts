import type {
  EventCategory,
  MutationResolvers,
  NotificationChannel,
  QueryResolvers,
} from '@grantjs/schema';
import { EVENT_CATEGORIES, NOTIFICATION_CHANNELS } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { ValidationError } from '@/lib/errors';

function parseEventCategory(value: string): EventCategory {
  if ((EVENT_CATEGORIES as readonly string[]).includes(value)) {
    return value as EventCategory;
  }
  throw new ValidationError(`Invalid notification category: ${value}`);
}

function parseNotificationChannel(
  value: NotificationChannel
): (typeof NOTIFICATION_CHANNELS)[number] {
  const asString = value as string;
  if ((NOTIFICATION_CHANNELS as readonly string[]).includes(asString)) {
    return asString as (typeof NOTIFICATION_CHANNELS)[number];
  }
  throw new ValidationError(`Invalid notification channel: ${asString}`);
}

export const myNotificationsResolver: QueryResolvers<GraphqlContext>['myNotifications'] = async (
  _parent,
  { input },
  context
) => {
  return context.handlers.me.myNotifications({
    unreadOnly: input?.unreadOnly ?? undefined,
    page: input?.page ?? undefined,
    limit: input?.limit ?? undefined,
  });
};

export const myUnreadNotificationCountResolver: QueryResolvers<GraphqlContext>['myUnreadNotificationCount'] =
  async (_parent, _args, context) => {
    return context.handlers.me.myUnreadNotificationCount();
  };

export const myNotificationPreferencesResolver: QueryResolvers<GraphqlContext>['myNotificationPreferences'] =
  async (_parent, { scopeTenant }, context) => {
    return context.handlers.me.myNotificationPreferences(scopeTenant);
  };

export const markMyNotificationReadResolver: MutationResolvers<GraphqlContext>['markMyNotificationRead'] =
  async (_parent, { id }, context) => {
    await context.handlers.me.markMyNotificationRead(id);
    return true;
  };

export const markAllMyNotificationsReadResolver: MutationResolvers<GraphqlContext>['markAllMyNotificationsRead'] =
  async (_parent, _args, context) => {
    return context.handlers.me.markAllMyNotificationsRead();
  };

export const setMyNotificationPreferenceResolver: MutationResolvers<GraphqlContext>['setMyNotificationPreference'] =
  async (_parent, { input }, context) => {
    return context.handlers.me.setMyNotificationPreference({
      scopeTenant: input.scopeTenant,
      scopeId: input.scopeId ?? undefined,
      category: parseEventCategory(input.category),
      channel: parseNotificationChannel(input.channel),
      enabled: input.enabled,
    });
  };
