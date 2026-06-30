/**
 * Canonical domain-event catalog.
 *
 * Single source of truth for every event `type` the platform emits, its
 * notification `category`, its `deliveryClass`, and the declarative
 * `audienceRule` consumed by the notification audience resolver. Services
 * reference these constants instead of string literals; a coverage test asserts
 * each mutating action that should emit has an entry here.
 */

export const EVENT_CATEGORIES = ['security', 'iam', 'membership', 'integrations'] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_DELIVERY_CLASSES = ['transactional', 'notification'] as const;
export type EventDeliveryClass = (typeof EVENT_DELIVERY_CLASSES)[number];

/** Declarative audience primitives resolved by the notification generator. */
export const AUDIENCE_PRIMITIVES = [
  'actor',
  'subject',
  'scopeMembers',
  'roleHolders',
  'owners',
  'watchers',
] as const;
export type AudiencePrimitive = (typeof AUDIENCE_PRIMITIVES)[number];

export interface AudienceRule {
  /** Primitives whose resolved users are unioned to form the candidate set. */
  primitives: readonly AudiencePrimitive[];
  /** Exclude the acting user from the resolved audience (default true). */
  excludeActor?: boolean;
}

export interface EventCatalogEntry {
  category: EventCategory;
  deliveryClass: EventDeliveryClass;
  audienceRule: AudienceRule;
}

export const EVENT_TYPES = [
  // IAM mutations (Phase 1 slice)
  'role.created',
  'permission.updated',
  'api_key.created',
  'api_key.rotated',
  'api_key.revoked',
  'user.role_assigned',
  'user.role_revoked',
  // Lifecycle / membership / security (Phase 3 seed)
  'organization.invitation_sent',
  'user.email_verification_requested',
  'organization.mfa_enforcement_changed',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_CATALOG: Readonly<Record<EventType, EventCatalogEntry>> = {
  'role.created': {
    category: 'iam',
    deliveryClass: 'notification',
    audienceRule: { primitives: ['roleHolders', 'owners', 'watchers'], excludeActor: true },
  },
  'permission.updated': {
    category: 'iam',
    deliveryClass: 'notification',
    audienceRule: { primitives: ['roleHolders', 'owners', 'watchers'], excludeActor: true },
  },
  'api_key.created': {
    category: 'security',
    deliveryClass: 'notification',
    audienceRule: { primitives: ['owners', 'watchers'], excludeActor: true },
  },
  'api_key.rotated': {
    category: 'security',
    deliveryClass: 'notification',
    audienceRule: { primitives: ['owners', 'watchers'], excludeActor: true },
  },
  'api_key.revoked': {
    category: 'security',
    deliveryClass: 'notification',
    audienceRule: { primitives: ['owners', 'watchers'], excludeActor: true },
  },
  'user.role_assigned': {
    category: 'iam',
    deliveryClass: 'notification',
    audienceRule: { primitives: ['subject', 'owners'], excludeActor: true },
  },
  'user.role_revoked': {
    category: 'iam',
    deliveryClass: 'notification',
    audienceRule: { primitives: ['subject', 'owners'], excludeActor: true },
  },
  'organization.invitation_sent': {
    category: 'membership',
    deliveryClass: 'notification',
    audienceRule: { primitives: ['subject'], excludeActor: true },
  },
  'user.email_verification_requested': {
    category: 'security',
    deliveryClass: 'transactional',
    audienceRule: { primitives: ['subject'], excludeActor: false },
  },
  'organization.mfa_enforcement_changed': {
    category: 'security',
    deliveryClass: 'notification',
    audienceRule: { primitives: ['scopeMembers'], excludeActor: false },
  },
};

export function getEventCatalogEntry(type: EventType): EventCatalogEntry {
  return EVENT_CATALOG[type];
}

export function isKnownEventType(type: string): type is EventType {
  return Object.prototype.hasOwnProperty.call(EVENT_CATALOG, type);
}
