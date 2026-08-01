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

/** Declarative audience primitives resolved by the notification audience resolver. */
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

const IAM_OWNERS: EventCatalogEntry = {
  category: 'iam',
  deliveryClass: 'notification',
  audienceRule: { primitives: ['owners'], excludeActor: true },
};

const IAM_SUBJECT_OWNERS: EventCatalogEntry = {
  category: 'iam',
  deliveryClass: 'notification',
  audienceRule: { primitives: ['subject', 'owners'], excludeActor: true },
};

const IAM_ROLE_HOLDERS_OWNERS: EventCatalogEntry = {
  category: 'iam',
  deliveryClass: 'notification',
  audienceRule: { primitives: ['roleHolders', 'owners'], excludeActor: true },
};

const MEMBERSHIP_SUBJECT_OWNERS: EventCatalogEntry = {
  category: 'membership',
  deliveryClass: 'notification',
  audienceRule: { primitives: ['subject', 'owners'], excludeActor: true },
};

const SECURITY_OWNERS: EventCatalogEntry = {
  category: 'security',
  deliveryClass: 'notification',
  audienceRule: { primitives: ['owners'], excludeActor: true },
};

const INTEGRATIONS_OWNERS: EventCatalogEntry = {
  category: 'integrations',
  deliveryClass: 'notification',
  audienceRule: { primitives: ['owners'], excludeActor: true },
};

export const EVENT_TYPES = [
  // IAM mutations (Phase 1 slice)
  'role.created',
  'role.updated',
  'role.deleted',
  'permission.created',
  'permission.updated',
  'permission.deleted',
  'group.created',
  'group.updated',
  'group.deleted',
  'resource.created',
  'resource.updated',
  'resource.deleted',
  'role.permission_assigned',
  'role.permission_revoked',
  'user.permission_assigned',
  'user.permission_revoked',
  'group.permission_assigned',
  'group.permission_revoked',
  'role.group_assigned',
  'role.group_revoked',
  'user.group_assigned',
  'user.group_revoked',
  'api_key.created',
  'api_key.rotated',
  'api_key.revoked',
  'user.role_assigned',
  'user.role_revoked',
  // Lifecycle / membership / security (Phase 3 seed)
  'organization.invitation_sent',
  'organization.invitation_accepted',
  'organization.invitation_revoked',
  'organization.member_added',
  'organization.member_role_changed',
  'organization.member_removed',
  'project.user_added',
  'project.user_removed',
  'project.user_profile_updated',
  'user.email_verification_requested',
  'organization.mfa_enforcement_changed',
  // CDM / project sync job summaries (entity events suppressed during import)
  'project_sync.completed',
  'project_sync.failed',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_CATALOG: Readonly<Record<EventType, EventCatalogEntry>> = {
  'role.created': IAM_ROLE_HOLDERS_OWNERS,
  'role.updated': IAM_OWNERS,
  'role.deleted': IAM_OWNERS,
  'permission.created': IAM_OWNERS,
  'permission.updated': IAM_ROLE_HOLDERS_OWNERS,
  'permission.deleted': IAM_OWNERS,
  'group.created': IAM_OWNERS,
  'group.updated': IAM_OWNERS,
  'group.deleted': IAM_OWNERS,
  'resource.created': IAM_OWNERS,
  'resource.updated': IAM_OWNERS,
  'resource.deleted': IAM_OWNERS,
  'role.permission_assigned': IAM_OWNERS,
  'role.permission_revoked': IAM_OWNERS,
  'user.permission_assigned': IAM_SUBJECT_OWNERS,
  'user.permission_revoked': IAM_SUBJECT_OWNERS,
  'group.permission_assigned': IAM_OWNERS,
  'group.permission_revoked': IAM_OWNERS,
  'role.group_assigned': IAM_OWNERS,
  'role.group_revoked': IAM_OWNERS,
  'user.group_assigned': IAM_SUBJECT_OWNERS,
  'user.group_revoked': IAM_SUBJECT_OWNERS,
  'api_key.created': SECURITY_OWNERS,
  'api_key.rotated': SECURITY_OWNERS,
  'api_key.revoked': SECURITY_OWNERS,
  'user.role_assigned': IAM_SUBJECT_OWNERS,
  'user.role_revoked': IAM_SUBJECT_OWNERS,
  'organization.invitation_sent': {
    category: 'membership',
    deliveryClass: 'notification',
    audienceRule: { primitives: ['subject'], excludeActor: true },
  },
  'organization.invitation_accepted': MEMBERSHIP_SUBJECT_OWNERS,
  'organization.invitation_revoked': MEMBERSHIP_SUBJECT_OWNERS,
  'organization.member_added': MEMBERSHIP_SUBJECT_OWNERS,
  'organization.member_role_changed': MEMBERSHIP_SUBJECT_OWNERS,
  'organization.member_removed': MEMBERSHIP_SUBJECT_OWNERS,
  'project.user_added': MEMBERSHIP_SUBJECT_OWNERS,
  'project.user_removed': MEMBERSHIP_SUBJECT_OWNERS,
  'project.user_profile_updated': MEMBERSHIP_SUBJECT_OWNERS,
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
  'project_sync.completed': INTEGRATIONS_OWNERS,
  'project_sync.failed': INTEGRATIONS_OWNERS,
};

export function getEventCatalogEntry(type: EventType): EventCatalogEntry {
  return EVENT_CATALOG[type];
}

export function isKnownEventType(type: string): type is EventType {
  return Object.prototype.hasOwnProperty.call(EVENT_CATALOG, type);
}
