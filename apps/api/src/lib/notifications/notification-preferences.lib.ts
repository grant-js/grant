import type { NotificationChannel, NotificationPreferenceModel } from '@grantjs/database';
import type { EventCategory } from '@grantjs/schema';

/**
 * Per-category, per-channel default enablement when a user has no explicit
 * preference. `security` is always-on and locked (handled in the resolver).
 */
const CATEGORY_CHANNEL_DEFAULTS: Record<EventCategory, Record<NotificationChannel, boolean>> = {
  security: { in_app: true, email: true },
  membership: { in_app: true, email: true },
  iam: { in_app: true, email: false },
  integrations: { in_app: true, email: false },
};

export function categoryChannelDefault(
  category: EventCategory,
  channel: NotificationChannel
): boolean {
  return CATEGORY_CHANNEL_DEFAULTS[category]?.[channel] ?? false;
}

/** Security notifications cannot be disabled by users. */
export function isLockedCategory(category: EventCategory): boolean {
  return category === 'security';
}

/**
 * Resolve whether a channel is enabled for a user, applying precedence:
 * `org_enforced > user (scope-specific) > user (global) > category default`.
 * `security` is always enabled.
 */
export function resolvePreferenceEnabled(params: {
  category: EventCategory;
  channel: NotificationChannel;
  scopeId: string;
  rows: NotificationPreferenceModel[];
}): boolean {
  const { category, channel, scopeId, rows } = params;

  if (isLockedCategory(category)) {
    return true;
  }

  const orgEnforced = rows.find((r) => r.source === 'org_enforced');
  if (orgEnforced) return orgEnforced.enabled;

  const specific = rows.find((r) => r.source === 'user' && r.scopeId === scopeId && scopeId !== '');
  if (specific) return specific.enabled;

  const global = rows.find((r) => r.source === 'user' && r.scopeId === '');
  if (global) return global.enabled;

  return categoryChannelDefault(category, channel);
}
