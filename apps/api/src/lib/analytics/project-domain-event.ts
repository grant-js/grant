import type {
  PasswordChangeReason,
  ProductAnalyticsEvent,
  ProductEventName,
  ProductEventProperties,
  ProjectSyncAnalyticsOperation,
  ProjectSyncAnalyticsResult,
} from '@grantjs/core';
import type { DomainEvent, EventType } from '@grantjs/schema';

const PASSWORD_REASONS = new Set<PasswordChangeReason>(['set', 'change', 'reset']);
const SYNC_OPERATIONS = new Set<ProjectSyncAnalyticsOperation>(['import', 'export']);

type PropertyMapper = (event: DomainEvent, base: ProductEventProperties) => ProductEventProperties;

interface DomainEventProjection {
  name: ProductEventName;
  properties?: PropertyMapper;
}

/**
 * Domain-event types that become a product event. Every other catalog type is ignored.
 * Property mappers add closed enums only. They do not copy `data.after`.
 */
const DOMAIN_EVENT_PROJECTIONS: Partial<Record<EventType, DomainEventProjection>> = {
  'organization.invitation_sent': { name: 'invitation.sent' },
  'organization.invitation_accepted': { name: 'invitation.accepted' },
  'api_key.created': { name: 'api_key.created' },
  'api_key.revoked': { name: 'api_key.revoked' },
  'user.mfa_enabled': {
    name: 'mfa.enrollment_changed',
    properties: (_event, base) => ({ ...base, enabled: true }),
  },
  'user.mfa_disabled': {
    name: 'mfa.enrollment_changed',
    properties: (_event, base) => ({ ...base, enabled: false }),
  },
  'user.password_changed': {
    name: 'password.changed',
    properties: (event, base) => {
      const reason = passwordReason(event);
      return reason ? { ...base, reason } : base;
    },
  },
  'project_sync.completed': {
    name: 'project_sync.finished',
    properties: (event, base) => syncProperties(event, base, 'completed'),
  },
  'project_sync.failed': {
    name: 'project_sync.finished',
    properties: (event, base) => syncProperties(event, base, 'failed'),
  },
};

function scopeProperties(event: DomainEvent): ProductEventProperties {
  const properties: ProductEventProperties = {
    scopeTenant: event.scope.tenant,
    scopeId: event.scope.id,
  };
  if (event.actorUserId) {
    properties.actorId = event.actorUserId;
  }
  return properties;
}

function passwordReason(event: DomainEvent): PasswordChangeReason | undefined {
  const reason = event.data.after?.reason;
  if (typeof reason === 'string' && PASSWORD_REASONS.has(reason as PasswordChangeReason)) {
    return reason as PasswordChangeReason;
  }
  return undefined;
}

function syncOperation(event: DomainEvent): ProjectSyncAnalyticsOperation | undefined {
  const operation = event.data.after?.operation;
  if (
    typeof operation === 'string' &&
    SYNC_OPERATIONS.has(operation as ProjectSyncAnalyticsOperation)
  ) {
    return operation as ProjectSyncAnalyticsOperation;
  }
  return undefined;
}

function syncProperties(
  event: DomainEvent,
  base: ProductEventProperties,
  result: ProjectSyncAnalyticsResult
): ProductEventProperties {
  const operation = syncOperation(event);
  return {
    ...base,
    result,
    ...(operation ? { operation } : {}),
    ...(event.aggregate?.kind === 'project' ? { projectId: event.aggregate.id } : {}),
  };
}

export function projectDomainEvent(event: DomainEvent): ProductAnalyticsEvent | null {
  const projection = DOMAIN_EVENT_PROJECTIONS[event.type];
  if (!projection) {
    return null;
  }

  const base = scopeProperties(event);
  return {
    name: projection.name,
    properties: projection.properties?.(event, base) ?? base,
  };
}
