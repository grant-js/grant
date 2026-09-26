/**
 * Product-analytics vocabulary for operators of a Grant deployment.
 * Names and property keys are the stable contract an analytics adapter charts.
 * They are not domain events and are not delivered to tenant webhooks.
 * Operator questions for each name live in docs/advanced-topics/analytics.md.
 */

export const PRODUCT_EVENT_NAMES = [
  'account.registered',
  'session.started',
  'session.failed',
  'organization.created',
  'project.created',
  'invitation.sent',
  'invitation.accepted',
  'mfa.enrollment_changed',
  'password.changed',
  'api_key.created',
  'api_key.revoked',
  'webhook_subscription.created',
  'project_sync.finished',
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export type ProductEventCategory = 'auth' | 'activation' | 'security' | 'integration';

export type AnalyticsAuthProvider = 'email' | 'github' | 'google';

export type SessionFailureReason = 'credentials' | 'unverified' | 'mfa';

export type PasswordChangeReason = 'set' | 'change' | 'reset';

export type ProjectSyncAnalyticsResult = 'completed' | 'failed';

export type ProjectSyncAnalyticsOperation = 'import' | 'export';

/** Closed property set. Values are enums or opaque ids. No email, name, secret, or URL. */
export interface ProductEventProperties {
  provider?: AnalyticsAuthProvider;
  reason?: SessionFailureReason | PasswordChangeReason;
  result?: ProjectSyncAnalyticsResult;
  operation?: ProjectSyncAnalyticsOperation;
  enabled?: boolean;
  stepUpRequired?: boolean;
  actorId?: string;
  scopeTenant?: string;
  scopeId?: string;
  projectId?: string;
}

export const PRODUCT_EVENT_CATEGORY: Readonly<Record<ProductEventName, ProductEventCategory>> = {
  'account.registered': 'auth',
  'session.started': 'auth',
  'session.failed': 'auth',
  'organization.created': 'activation',
  'project.created': 'activation',
  'invitation.sent': 'activation',
  'invitation.accepted': 'activation',
  'mfa.enrollment_changed': 'security',
  'password.changed': 'security',
  'api_key.created': 'security',
  'api_key.revoked': 'security',
  'webhook_subscription.created': 'integration',
  'project_sync.finished': 'integration',
};

export interface ProductAnalyticsEvent {
  name: ProductEventName;
  properties?: ProductEventProperties;
  requestId?: string;
}
