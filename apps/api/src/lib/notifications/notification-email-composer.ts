import type { SupportedLocale } from '@grantjs/i18n';
import type { DomainEvent } from '@grantjs/schema';

import { defaultLocale, translateStatic } from '@/i18n';

import type { NotificationDisplayContext } from './notification-display-context';
import {
  NOTIFICATION_EMAIL_FAMILY_BY_TYPE,
  type NotificationEmailFamily,
} from './notification-email-families';
import {
  absoluteFrontendUrl,
  buildNotificationDashboardPath,
  buildNotificationInboxPath,
  buildNotificationPreferencesPath,
} from './notification-email-href';

interface NotificationEmailDetail {
  label: string;
  value: string;
}

export interface ComposedNotificationEmail {
  subject: string;
  heading: string;
  summary: string;
  details: NotificationEmailDetail[];
  ctaUrl: string;
  ctaLabel: string;
  preferencesUrl: string;
  footer: string;
}

export interface ComposeNotificationEmailParams {
  event: DomainEvent | null;
  ctx: NotificationDisplayContext;
  recipientUserId: string;
  refEntity: string | null;
  refId: string | null;
  fallbackTitle: string;
  fallbackBody: string | null;
  locale?: SupportedLocale;
}

const EMPTY_CONTEXT: NotificationDisplayContext = {
  actorName: null,
  scopeName: null,
  roleName: null,
  entityName: null,
  permissionName: null,
  groupName: null,
  subjectName: null,
};

type NamedEntityKind = 'role' | 'permission' | 'group' | 'resource';
type NamedEntityVerb = 'created' | 'updated' | 'deleted';

const NAMED_ENTITY_EVENTS: Record<string, { kind: NamedEntityKind; verb: NamedEntityVerb }> = {
  'role.created': { kind: 'role', verb: 'created' },
  'role.updated': { kind: 'role', verb: 'updated' },
  'role.deleted': { kind: 'role', verb: 'deleted' },
  'permission.created': { kind: 'permission', verb: 'created' },
  'permission.updated': { kind: 'permission', verb: 'updated' },
  'permission.deleted': { kind: 'permission', verb: 'deleted' },
  'group.created': { kind: 'group', verb: 'created' },
  'group.updated': { kind: 'group', verb: 'updated' },
  'group.deleted': { kind: 'group', verb: 'deleted' },
  'resource.created': { kind: 'resource', verb: 'created' },
  'resource.updated': { kind: 'resource', verb: 'updated' },
  'resource.deleted': { kind: 'resource', verb: 'deleted' },
};

const ASSIGNMENT_EVENTS: Record<
  string,
  { entity: 'permission' | 'group'; verb: 'assigned' | 'revoked'; target: 'role' | 'group' }
> = {
  'role.permission_assigned': { entity: 'permission', verb: 'assigned', target: 'role' },
  'role.permission_revoked': { entity: 'permission', verb: 'revoked', target: 'role' },
  'group.permission_assigned': { entity: 'permission', verb: 'assigned', target: 'group' },
  'group.permission_revoked': { entity: 'permission', verb: 'revoked', target: 'group' },
  'role.group_assigned': { entity: 'group', verb: 'assigned', target: 'role' },
  'role.group_revoked': { entity: 'group', verb: 'revoked', target: 'role' },
};

const SUBJECT_ASSIGNMENT_EVENTS: Record<
  string,
  { entity: 'permission' | 'group'; verb: 'assigned' | 'revoked' }
> = {
  'user.permission_assigned': { entity: 'permission', verb: 'assigned' },
  'user.permission_revoked': { entity: 'permission', verb: 'revoked' },
  'user.group_assigned': { entity: 'group', verb: 'assigned' },
  'user.group_revoked': { entity: 'group', verb: 'revoked' },
};

const API_KEY_EVENTS: Record<string, 'created' | 'rotated' | 'revoked'> = {
  'api_key.created': 'created',
  'api_key.rotated': 'rotated',
  'api_key.revoked': 'revoked',
};

const INVITATION_EVENTS: Record<string, 'sent' | 'accepted' | 'revoked'> = {
  'organization.invitation_sent': 'sent',
  'organization.invitation_accepted': 'accepted',
  'organization.invitation_revoked': 'revoked',
};

const MEMBERSHIP_I18N_KEYS: Record<string, string> = {
  'organization.member_added': 'organizationMemberAdded',
  'organization.member_role_changed': 'organizationMemberRoleChanged',
  'organization.member_removed': 'organizationMemberRemoved',
  'project.user_added': 'projectUserAdded',
  'project.user_removed': 'projectUserRemoved',
  'project.user_profile_updated': 'projectUserProfileUpdated',
};

function composeMembership(
  event: DomainEvent,
  ctx: NotificationDisplayContext,
  recipientUserId: string,
  fragments: { byActor: string; inScope: string },
  locale: SupportedLocale
): { subject: string; summary: string } {
  const key = MEMBERSHIP_I18N_KEYS[event.type] ?? 'organizationMemberAdded';
  const you = isSubjectRecipient(event, recipientUserId);
  const summaryKey = you ? 'you' : ctx.subjectName ? 'named' : 'generic';
  const params = { member: ctx.subjectName ?? '', ...fragments };
  return {
    subject: t(`email.notification.membership.${key}.subject`, locale),
    summary: t(`email.notification.membership.${key}.${summaryKey}`, locale, params),
  };
}

export function composeNotificationEmail(
  params: ComposeNotificationEmailParams
): ComposedNotificationEmail {
  const locale = params.locale ?? defaultLocale;
  const ctx = params.ctx ?? EMPTY_CONTEXT;
  const fragments = actorScopeFragments(ctx, locale);

  const copy = params.event
    ? composeFamily(params.event, ctx, params.recipientUserId, fragments, locale)
    : {
        subject:
          params.fallbackTitle ||
          translateStatic('email.notification.fallback.defaultTitle', locale),
        summary: params.fallbackBody ?? params.fallbackTitle,
      };

  const details = buildDetails(params.event, ctx, params.recipientUserId, locale);
  const path =
    buildNotificationDashboardPath({
      refEntity: params.refEntity,
      refId: params.refId,
      scope: params.event?.scope ?? null,
    }) ?? buildNotificationInboxPath();

  return {
    subject: copy.subject,
    heading: copy.subject,
    summary: copy.summary,
    details,
    ctaUrl: absoluteFrontendUrl(path, locale),
    ctaLabel: translateStatic('email.notification.common.viewInGrant', locale),
    preferencesUrl: absoluteFrontendUrl(buildNotificationPreferencesPath(), locale),
    footer: translateStatic('email.notification.common.footer', locale),
  };
}

function composeFamily(
  event: DomainEvent,
  ctx: NotificationDisplayContext,
  recipientUserId: string,
  fragments: { byActor: string; inScope: string },
  locale: SupportedLocale
): { subject: string; summary: string } {
  const family: NotificationEmailFamily = NOTIFICATION_EMAIL_FAMILY_BY_TYPE[event.type];

  switch (family) {
    case 'namedEntity':
      return composeNamedEntity(event, ctx, fragments, locale);
    case 'assignment':
      return composeAssignment(event, ctx, fragments, locale);
    case 'subjectAssignment':
      return composeSubjectAssignment(event, ctx, recipientUserId, fragments, locale);
    case 'apiKey':
      return composeApiKey(event, ctx, fragments, locale);
    case 'userRole':
      return composeUserRole(event, ctx, recipientUserId, fragments, locale);
    case 'invitation':
      return composeInvitation(event, ctx, fragments, locale);
    case 'membership':
      return composeMembership(event, ctx, recipientUserId, fragments, locale);
    case 'security':
      return composeSecurity(event, ctx, recipientUserId, fragments, locale);
    case 'sync':
      return composeSync(event, fragments, locale);
  }
}

function composeNamedEntity(
  event: DomainEvent,
  ctx: NotificationDisplayContext,
  fragments: { byActor: string; inScope: string },
  locale: SupportedLocale
): { subject: string; summary: string } {
  const spec = NAMED_ENTITY_EVENTS[event.type];
  if (!spec) {
    return fallbackCopy(locale);
  }
  const name = ctx.entityName;
  const suffix = name ? 'Named' : 'Unnamed';
  const params = {
    label: translateStatic(`email.notification.labels.${spec.kind}`, locale),
    name: name ?? '',
    indefinite: translateStatic(`email.notification.indefinite.${spec.kind}`, locale),
    ...fragments,
  };
  return {
    subject: t(`email.notification.namedEntity.${spec.verb}.subject${suffix}`, locale, params),
    summary: t(`email.notification.namedEntity.${spec.verb}.summary${suffix}`, locale, params),
  };
}

function composeAssignment(
  event: DomainEvent,
  ctx: NotificationDisplayContext,
  fragments: { byActor: string; inScope: string },
  locale: SupportedLocale
): { subject: string; summary: string } {
  const spec = ASSIGNMENT_EVENTS[event.type];
  if (!spec) {
    return fallbackCopy(locale);
  }
  const entityName = spec.entity === 'permission' ? ctx.permissionName : ctx.groupName;
  const targetName = spec.target === 'role' ? ctx.roleName : ctx.groupName;
  const summaryKey =
    entityName && targetName ? 'summaryNamed' : entityName ? 'summaryEntityOnly' : 'summaryGeneric';
  const params = {
    entityLabel: translateStatic(`email.notification.labels.${spec.entity}`, locale),
    entityName: entityName ?? '',
    entityIndefinite: translateStatic(`email.notification.indefinite.${spec.entity}`, locale),
    targetLabel: translateStatic(`email.notification.target.${spec.target}`, locale),
    targetName: targetName ?? '',
    targetIndefinite: translateStatic(
      spec.target === 'role'
        ? 'email.notification.target.aRole'
        : 'email.notification.target.aGroup',
      locale
    ),
    ...fragments,
  };
  return {
    subject: t(`email.notification.assignment.${spec.verb}.subject`, locale, params),
    summary: t(`email.notification.assignment.${spec.verb}.${summaryKey}`, locale, params),
  };
}

function composeSubjectAssignment(
  event: DomainEvent,
  ctx: NotificationDisplayContext,
  recipientUserId: string,
  fragments: { byActor: string; inScope: string },
  locale: SupportedLocale
): { subject: string; summary: string } {
  const spec = SUBJECT_ASSIGNMENT_EVENTS[event.type];
  if (!spec) {
    return fallbackCopy(locale);
  }
  const entityName = spec.entity === 'permission' ? ctx.permissionName : ctx.groupName;
  const you = isSubjectRecipient(event, recipientUserId);
  const summaryKey = you
    ? entityName
      ? 'summaryYouNamed'
      : 'summaryYouGeneric'
    : entityName
      ? 'summaryOtherNamed'
      : 'summaryOtherGeneric';
  const params = {
    entityLabel: translateStatic(`email.notification.labels.${spec.entity}`, locale),
    entityName: entityName ?? '',
    entityIndefinite: translateStatic(`email.notification.indefinite.${spec.entity}`, locale),
    member:
      ctx.subjectName ?? translateStatic('email.notification.details.member', locale).toLowerCase(),
    ...fragments,
  };
  return {
    subject: t(`email.notification.subjectAssignment.${spec.verb}.subject`, locale, params),
    summary: t(`email.notification.subjectAssignment.${spec.verb}.${summaryKey}`, locale, params),
  };
}

function composeApiKey(
  event: DomainEvent,
  ctx: NotificationDisplayContext,
  fragments: { byActor: string; inScope: string },
  locale: SupportedLocale
): { subject: string; summary: string } {
  const verb = API_KEY_EVENTS[event.type];
  if (!verb) {
    return fallbackCopy(locale);
  }
  const name =
    ctx.entityName ??
    stringField(event.data.after, 'name') ??
    stringField(event.data.before, 'name');
  const suffix = name ? 'Named' : 'Unnamed';
  const params = { name: name ?? '', ...fragments };
  return {
    subject: t(`email.notification.apiKey.${verb}.subject${suffix}`, locale, params),
    summary: t(`email.notification.apiKey.${verb}.summary${suffix}`, locale, params),
  };
}

function composeUserRole(
  event: DomainEvent,
  ctx: NotificationDisplayContext,
  recipientUserId: string,
  fragments: { byActor: string; inScope: string },
  locale: SupportedLocale
): { subject: string; summary: string } {
  const verb = event.type === 'user.role_revoked' ? 'revoked' : 'assigned';
  const you = isSubjectRecipient(event, recipientUserId);
  const role = ctx.roleName;
  const summaryKey = you
    ? role
      ? 'summaryYouNamed'
      : 'summaryYouGeneric'
    : role
      ? 'summaryOtherNamed'
      : 'summaryOtherGeneric';
  const params = {
    role: role ?? '',
    member: ctx.subjectName ?? translateStatic('email.notification.details.member', locale),
    ...fragments,
  };
  const subjectSuffix = role ? 'Named' : 'Unnamed';
  return {
    subject: t(`email.notification.userRole.${verb}.subject${subjectSuffix}`, locale, params),
    summary: t(`email.notification.userRole.${verb}.${summaryKey}`, locale, params),
  };
}

function composeInvitation(
  event: DomainEvent,
  ctx: NotificationDisplayContext,
  fragments: { byActor: string; inScope: string },
  locale: SupportedLocale
): { subject: string; summary: string } {
  const verb = INVITATION_EVENTS[event.type];
  if (!verb) {
    return fallbackCopy(locale);
  }
  const suffix = ctx.scopeName ? 'Named' : 'Unnamed';
  const params = { scopeName: ctx.scopeName ?? '', ...fragments };
  return {
    subject: t(`email.notification.invitation.${verb}.subject${suffix}`, locale, params),
    summary: t(`email.notification.invitation.${verb}.summary${suffix}`, locale, params),
  };
}

function composeSecurity(
  event: DomainEvent,
  ctx: NotificationDisplayContext,
  recipientUserId: string,
  fragments: { byActor: string; inScope: string },
  locale: SupportedLocale
): { subject: string; summary: string } {
  const you = isSubjectRecipient(event, recipientUserId);
  const memberParams = {
    member: ctx.subjectName ?? '',
    scopeName: ctx.scopeName ?? translateStatic('email.notification.details.workspace', locale),
    ...fragments,
  };

  switch (event.type) {
    case 'user.email_verification_requested':
      return {
        subject: t('email.notification.security.emailVerification.subject', locale),
        summary: t('email.notification.security.emailVerification.summary', locale),
      };
    case 'organization.mfa_enforcement_changed': {
      const enabled = booleanField(event.data.after, 'requireMfaForSensitiveActions');
      const variant = enabled === true ? 'mfaPolicyEnabled' : 'mfaPolicyDisabled';
      return {
        subject: t(`email.notification.security.${variant}.subject`, locale),
        summary: t(`email.notification.security.${variant}.summary`, locale, memberParams),
      };
    }
    case 'signing_key.created':
      return {
        subject: t('email.notification.security.signingKeyCreated.subject', locale),
        summary: t('email.notification.security.signingKeyCreated.summary', locale, fragments),
      };
    case 'signing_key.rotated':
      return {
        subject: t('email.notification.security.signingKeyRotated.subject', locale),
        summary: t('email.notification.security.signingKeyRotated.summary', locale, fragments),
      };
    case 'user.mfa_enabled':
      return subjectSecurityCopy('mfaEnabled', you, ctx, memberParams, locale);
    case 'user.mfa_disabled':
      return subjectSecurityCopy('mfaDisabled', you, ctx, memberParams, locale);
    case 'user.mfa_recovery_codes_regenerated':
      return subjectSecurityCopy('recoveryCodes', you, ctx, memberParams, locale);
    case 'user.session_revoked':
      return subjectSecurityCopy('sessionRevoked', you, ctx, memberParams, locale);
    case 'user.sessions_revoked': {
      const count = numberField(event.data.after, 'count');
      const countLabel =
        count == null
          ? t('email.notification.security.sessionsCountUnknown', locale)
          : count === 1
            ? t('email.notification.security.sessionCountOne', locale)
            : t('email.notification.security.sessionsCount', locale, { count });
      return subjectSecurityCopy(
        'sessionsRevoked',
        you,
        ctx,
        { ...memberParams, countLabel },
        locale
      );
    }
    case 'user.password_changed':
      return subjectSecurityCopy('passwordChanged', you, ctx, memberParams, locale);
    default:
      return {
        subject: t('email.notification.fallback.defaultTitle', locale),
        summary: t('email.notification.fallback.defaultTitle', locale),
      };
  }
}

function composeSync(
  event: DomainEvent,
  fragments: { byActor: string; inScope: string },
  locale: SupportedLocale
): { subject: string; summary: string } {
  const operation = stringField(event.data.after, 'operation') ?? 'import';
  const failed = event.type === 'project_sync.failed';
  const key =
    operation === 'export'
      ? failed
        ? 'exportFailed'
        : 'exportCompleted'
      : failed
        ? 'importFailed'
        : 'importCompleted';
  const errorMessage = failed ? stringField(event.data.after, 'errorMessage') : null;
  const summary = t(`email.notification.sync.${key}.summary`, locale, fragments);
  return {
    subject: t(`email.notification.sync.${key}.subject`, locale),
    summary: errorMessage ? `${summary} ${errorMessage}` : summary,
  };
}

function subjectSecurityCopy(
  key: string,
  you: boolean,
  ctx: NotificationDisplayContext,
  params: Record<string, unknown>,
  locale: SupportedLocale
): { subject: string; summary: string } {
  const summaryKey = you ? 'you' : ctx.subjectName ? 'named' : 'generic';
  return {
    subject: t(`email.notification.security.${key}.subject`, locale),
    summary: t(`email.notification.security.${key}.${summaryKey}`, locale, params),
  };
}

function buildDetails(
  event: DomainEvent | null,
  ctx: NotificationDisplayContext,
  recipientUserId: string,
  locale: SupportedLocale
): NotificationEmailDetail[] {
  const details: NotificationEmailDetail[] = [];
  const push = (labelKey: string, value: string | null | undefined) => {
    if (!value) return;
    details.push({ label: translateStatic(labelKey, locale), value });
  };

  if (event) {
    push('email.notification.details.when', formatWhen(event.occurredAt, locale));
  }
  push('email.notification.details.actor', ctx.actorName);
  push('email.notification.details.workspace', ctx.scopeName);
  push('email.notification.details.entity', ctx.entityName);
  push('email.notification.details.role', ctx.roleName);
  push('email.notification.details.permission', ctx.permissionName);
  push('email.notification.details.group', ctx.groupName);
  if (event && !isSubjectRecipient(event, recipientUserId)) {
    push('email.notification.details.member', ctx.subjectName);
  }
  if (event?.type === 'project_sync.failed') {
    push('email.notification.details.error', stringField(event.data.after, 'errorMessage'));
  }
  return details;
}

function actorScopeFragments(
  ctx: NotificationDisplayContext,
  locale: SupportedLocale
): { byActor: string; inScope: string } {
  return {
    byActor: ctx.actorName
      ? t('email.notification.common.byActor', locale, { actorName: ctx.actorName })
      : '',
    inScope: ctx.scopeName
      ? t('email.notification.common.inScope', locale, { scopeName: ctx.scopeName })
      : '',
  };
}

function isSubjectRecipient(event: DomainEvent, recipientUserId: string): boolean {
  return Boolean(event.subjectUserId && event.subjectUserId === recipientUserId);
}

function formatWhen(date: Date, locale: SupportedLocale): string {
  return `${new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)} UTC`;
}

function fallbackCopy(locale: SupportedLocale): { subject: string; summary: string } {
  const title = t('email.notification.fallback.defaultTitle', locale);
  return { subject: title, summary: title };
}

function t(key: string, locale: SupportedLocale, params?: Record<string, unknown>): string {
  return translateStatic(key, locale, params);
}

function stringField(
  record: Record<string, unknown> | null | undefined,
  key: string
): string | null {
  const value = record?.[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function booleanField(
  record: Record<string, unknown> | null | undefined,
  key: string
): boolean | null {
  const value = record?.[key];
  return typeof value === 'boolean' ? value : null;
}

function numberField(
  record: Record<string, unknown> | null | undefined,
  key: string
): number | null {
  const value = record?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
