import type { DomainEvent, EventType } from '@grantjs/schema';

import type { NotificationDisplayContext } from './notification-display-context';

export interface RenderedNotification {
  title: string;
  body: string | null;
  refEntity: string | null;
  refId: string | null;
}

export interface RenderNotificationOptions {
  recipientUserId?: string | null;
}

type Renderer = (
  event: DomainEvent,
  ctx: NotificationDisplayContext,
  options: RenderNotificationOptions
) => { title: string; body: string | null };

const EMPTY_CONTEXT: NotificationDisplayContext = {
  actorName: null,
  scopeName: null,
  roleName: null,
  entityName: null,
  permissionName: null,
  groupName: null,
  subjectName: null,
};

const RENDERERS: Partial<Record<EventType, Renderer>> = {
  'role.created': (e, ctx) => namedEntityMutation(e, ctx, 'Role', 'created'),
  'role.updated': (e, ctx) => namedEntityMutation(e, ctx, 'Role', 'updated'),
  'role.deleted': (e, ctx) => namedEntityMutation(e, ctx, 'Role', 'deleted', true),
  'permission.created': (e, ctx) => namedEntityMutation(e, ctx, 'Permission', 'created'),
  'permission.updated': (e, ctx) => namedEntityMutation(e, ctx, 'Permission', 'updated'),
  'permission.deleted': (e, ctx) => namedEntityMutation(e, ctx, 'Permission', 'deleted', true),
  'group.created': (e, ctx) => namedEntityMutation(e, ctx, 'Group', 'created'),
  'group.updated': (e, ctx) => namedEntityMutation(e, ctx, 'Group', 'updated'),
  'group.deleted': (e, ctx) => namedEntityMutation(e, ctx, 'Group', 'deleted', true),
  'resource.created': (e, ctx) => namedEntityMutation(e, ctx, 'Resource', 'created'),
  'resource.updated': (e, ctx) => namedEntityMutation(e, ctx, 'Resource', 'updated'),
  'resource.deleted': (e, ctx) => namedEntityMutation(e, ctx, 'Resource', 'deleted', true),
  'role.permission_assigned': (_e, ctx) =>
    assignmentMutation(ctx, 'Permission', 'assigned', 'role'),
  'role.permission_revoked': (_e, ctx) => assignmentMutation(ctx, 'Permission', 'revoked', 'role'),
  'user.permission_assigned': (e, ctx, options) =>
    subjectAssignmentMutation(e, ctx, options, 'Permission', 'assigned'),
  'user.permission_revoked': (e, ctx, options) =>
    subjectAssignmentMutation(e, ctx, options, 'Permission', 'revoked'),
  'group.permission_assigned': (_e, ctx) =>
    assignmentMutation(ctx, 'Permission', 'assigned', 'group'),
  'group.permission_revoked': (_e, ctx) =>
    assignmentMutation(ctx, 'Permission', 'revoked', 'group'),
  'role.group_assigned': (_e, ctx) => assignmentMutation(ctx, 'Group', 'assigned', 'role'),
  'role.group_revoked': (_e, ctx) => assignmentMutation(ctx, 'Group', 'revoked', 'role'),
  'user.group_assigned': (e, ctx, options) =>
    subjectAssignmentMutation(e, ctx, options, 'Group', 'assigned'),
  'user.group_revoked': (e, ctx, options) =>
    subjectAssignmentMutation(e, ctx, options, 'Group', 'revoked'),
  'api_key.created': (e, ctx) => {
    const name = ctx.entityName ?? stringField(e.data.after, 'name');
    return {
      title: name ? `API key "${name}" created` : 'API key created',
      body: name
        ? `API key "${name}" was created${byActor(ctx)}${inScope(ctx)}.`
        : `A new API key was created${byActor(ctx)}${inScope(ctx)}.`,
    };
  },
  'api_key.rotated': (e, ctx) => {
    const name =
      ctx.entityName ?? stringField(e.data.after, 'name') ?? stringField(e.data.before, 'name');
    return {
      title: name ? `API key "${name}" rotated` : 'API key rotated',
      body: name
        ? `API key "${name}" was rotated${byActor(ctx)}${inScope(ctx)}.`
        : `An API key was rotated${byActor(ctx)}${inScope(ctx)}.`,
    };
  },
  'api_key.revoked': (e, ctx) => {
    const name =
      ctx.entityName ?? stringField(e.data.before, 'name') ?? stringField(e.data.after, 'name');
    return {
      title: name ? `API key "${name}" revoked` : 'API key revoked',
      body: name
        ? `API key "${name}" was revoked${byActor(ctx)}${inScope(ctx)}.`
        : `An API key was revoked${byActor(ctx)}${inScope(ctx)}.`,
    };
  },
  'user.role_assigned': (e, ctx, options) => userRoleMutation(e, ctx, options, 'assigned'),
  'user.role_revoked': (e, ctx, options) => userRoleMutation(e, ctx, options, 'revoked'),
  'organization.invitation_sent': (_e, ctx) => ({
    title: ctx.scopeName ? `Invitation to ${ctx.scopeName}` : 'You have an invitation',
    body: ctx.scopeName
      ? `You were invited to join ${ctx.scopeName}${byActor(ctx)}.`
      : `You were invited to join an organization${byActor(ctx)}.`,
  }),
  'organization.invitation_accepted': (_e, ctx) => ({
    title: ctx.scopeName ? `Invitation accepted — ${ctx.scopeName}` : 'Invitation accepted',
    body: ctx.scopeName
      ? `An invitation to ${ctx.scopeName} was accepted${byActor(ctx)}.`
      : `An organization invitation was accepted${byActor(ctx)}.`,
  }),
  'organization.invitation_revoked': (_e, ctx) => ({
    title: ctx.scopeName ? `Invitation revoked — ${ctx.scopeName}` : 'Invitation revoked',
    body: ctx.scopeName
      ? `An invitation to ${ctx.scopeName} was revoked${byActor(ctx)}.`
      : `An organization invitation was revoked${byActor(ctx)}.`,
  }),
  'organization.member_added': (e, ctx, options) =>
    membershipMutation(e, ctx, options, 'Member added', {
      you: 'You joined',
      named: (name) => `${name} joined`,
      generic: 'A member joined',
    }),
  'organization.member_role_changed': (e, ctx, options) =>
    membershipMutation(e, ctx, options, 'Member role changed', {
      you: 'Your role was changed',
      named: (name) => `${name} had their role changed`,
      generic: 'A member had their role changed',
    }),
  'organization.member_removed': (e, ctx, options) =>
    membershipMutation(e, ctx, options, 'Member removed', {
      you: 'You were removed',
      named: (name) => `${name} was removed`,
      generic: 'A member was removed',
    }),
  'project.user_added': (e, ctx, options) =>
    membershipMutation(e, ctx, options, 'Project member added', {
      you: 'You were added to the project',
      named: (name) => `${name} was added to the project`,
      generic: 'A member was added to the project',
    }),
  'project.user_removed': (e, ctx, options) =>
    membershipMutation(e, ctx, options, 'Project member removed', {
      you: 'You were removed from the project',
      named: (name) => `${name} was removed from the project`,
      generic: 'A member was removed from the project',
    }),
  'project.user_profile_updated': (e, ctx, options) =>
    membershipMutation(e, ctx, options, 'Project profile updated', {
      you: 'You updated your project profile',
      named: (name) => `${name} updated their project profile`,
      generic: 'A member updated their project profile',
    }),
  'user.email_verification_requested': () => ({
    title: 'Verify your email',
    body: 'Please verify your email address.',
  }),
  'organization.mfa_enforcement_changed': (e, ctx) => {
    const enabled = booleanField(e.data.after, 'requireMfaForSensitiveActions');
    const org = ctx.scopeName ?? 'Your organization';
    const policy =
      enabled === true
        ? 'now requires MFA for sensitive actions'
        : 'no longer requires MFA for sensitive actions';
    return {
      title: 'MFA policy changed',
      body: `${org} ${policy}${byActor(ctx)}.`,
    };
  },
  'signing_key.created': (_e, ctx) => ({
    title: 'Signing key created',
    body: `A signing key was created${byActor(ctx)}${inScope(ctx)}.`,
  }),
  'signing_key.rotated': (_e, ctx) => ({
    title: 'Signing key rotated',
    body: `A signing key was rotated${byActor(ctx)}${inScope(ctx)}.`,
  }),
  'user.mfa_enabled': (e, ctx, options) =>
    subjectSecurityMutation(e, ctx, options, 'MFA enabled', {
      you: 'Multi-factor authentication was enabled on your account',
      named: (name) => `Multi-factor authentication was enabled on ${name}'s account`,
      generic: 'Multi-factor authentication was enabled on an account',
    }),
  'user.mfa_disabled': (e, ctx, options) =>
    subjectSecurityMutation(e, ctx, options, 'MFA disabled', {
      you: 'Multi-factor authentication was disabled on your account',
      named: (name) => `Multi-factor authentication was disabled on ${name}'s account`,
      generic: 'Multi-factor authentication was disabled on an account',
    }),
  'user.mfa_recovery_codes_regenerated': (e, ctx, options) =>
    subjectSecurityMutation(e, ctx, options, 'MFA recovery codes regenerated', {
      you: 'Your MFA recovery codes were regenerated',
      named: (name) => `${name}'s MFA recovery codes were regenerated`,
      generic: 'MFA recovery codes were regenerated',
    }),
  'user.session_revoked': (e, ctx, options) =>
    subjectSecurityMutation(e, ctx, options, 'Session revoked', {
      you: 'A session was revoked on your account',
      named: (name) => `A session was revoked on ${name}'s account`,
      generic: 'A session was revoked on an account',
    }),
  'user.sessions_revoked': (e, ctx, options) => {
    const count = numberField(e.data.after, 'count');
    const countLabel =
      count != null
        ? `${count} session${count === 1 ? '' : 's'} were revoked`
        : 'All sessions were revoked';
    return subjectSecurityMutation(e, ctx, options, 'All sessions revoked', {
      you: `${countLabel} on your account`,
      named: (name) => `${countLabel} on ${name}'s account`,
      generic: `${countLabel} on an account`,
    });
  },
  'user.password_changed': (e, ctx, options) =>
    subjectSecurityMutation(e, ctx, options, 'Password changed', {
      you: 'Your password was changed',
      named: (name) => `${name}'s password was changed`,
      generic: 'A password was changed',
    }),
  'project_sync.completed': (e, ctx) => {
    const operation = stringField(e.data.after, 'operation') ?? 'import';
    const where = inScope(ctx);
    return {
      title: operation === 'export' ? 'Project export completed' : 'Project sync completed',
      body:
        operation === 'export' ? `CDM export completed${where}.` : `CDM import completed${where}.`,
    };
  },
  'project_sync.failed': (e, ctx) => {
    const operation = stringField(e.data.after, 'operation') ?? 'import';
    const where = inScope(ctx);
    const errorMessage = stringField(e.data.after, 'errorMessage');
    const detail = errorMessage ? `: ${errorMessage}` : '.';
    return {
      title: operation === 'export' ? 'Project export failed' : 'Project sync failed',
      body:
        operation === 'export'
          ? `CDM export failed${where}${detail}`
          : `CDM import failed${where}${detail}`,
    };
  },
};

export function renderNotification(
  event: DomainEvent,
  ctx: NotificationDisplayContext = EMPTY_CONTEXT,
  options: RenderNotificationOptions = {}
): RenderedNotification {
  const renderer = RENDERERS[event.type];
  const rendered = renderer
    ? renderer(event, ctx, options)
    : { title: humanizeType(event.type), body: null };
  return {
    title: rendered.title,
    body: rendered.body,
    refEntity: event.aggregate?.kind ?? null,
    refId: event.aggregate?.id ?? null,
  };
}

function isSubjectRecipient(event: DomainEvent, options: RenderNotificationOptions): boolean {
  if (!event.subjectUserId) return false;
  if (!options.recipientUserId) return true;
  return options.recipientUserId === event.subjectUserId;
}

function byActor(ctx: NotificationDisplayContext): string {
  return ctx.actorName ? ` by ${ctx.actorName}` : '';
}

function inScope(ctx: NotificationDisplayContext): string {
  return ctx.scopeName ? ` in ${ctx.scopeName}` : '';
}

function namedEntityMutation(
  event: DomainEvent,
  ctx: NotificationDisplayContext,
  label: string,
  verb: 'created' | 'updated' | 'deleted',
  preferBefore = false
): { title: string; body: string | null } {
  const name =
    ctx.entityName ??
    (preferBefore
      ? (stringField(event.data.before, 'name') ?? stringField(event.data.after, 'name'))
      : (stringField(event.data.after, 'name') ?? stringField(event.data.before, 'name')));
  const where = inScope(ctx);
  const by = byActor(ctx);
  const lower = label.toLowerCase();
  return {
    title: name ? `${label} "${name}" ${verb}` : `${label} ${verb}`,
    body: name
      ? `${label} "${name}" was ${verb}${by}${where}.`
      : `A ${lower} was ${verb}${by}${where}.`,
  };
}

function assignmentMutation(
  ctx: NotificationDisplayContext,
  entityLabel: 'Permission' | 'Group',
  verb: 'assigned' | 'revoked',
  target: 'role' | 'group'
): { title: string; body: string | null } {
  const where = inScope(ctx);
  const by = byActor(ctx);
  const entityName = entityLabel === 'Permission' ? ctx.permissionName : ctx.groupName;
  const targetName = target === 'role' ? ctx.roleName : ctx.groupName;
  const targetIndefinite = target === 'role' ? 'a role' : 'a group';
  const preposition = verb === 'assigned' ? 'to' : 'from';
  const targetPhrase = targetName ? `${target} "${targetName}"` : targetIndefinite;
  const entityPhrase = entityName
    ? `${entityLabel} "${entityName}"`
    : `A ${entityLabel.toLowerCase()}`;

  return {
    title: `${entityLabel} ${verb}`,
    body: `${entityPhrase} was ${verb} ${preposition} ${targetPhrase}${by}${where}.`,
  };
}

function subjectAssignmentMutation(
  event: DomainEvent,
  ctx: NotificationDisplayContext,
  options: RenderNotificationOptions,
  entityLabel: 'Permission' | 'Group',
  verb: 'assigned' | 'revoked'
): { title: string; body: string | null } {
  const where = inScope(ctx);
  const by = byActor(ctx);
  const entityName = entityLabel === 'Permission' ? ctx.permissionName : ctx.groupName;
  const entityPhrase = entityName
    ? `${entityLabel} "${entityName}"`
    : `A ${entityLabel.toLowerCase()}`;
  const preposition = verb === 'assigned' ? 'to' : 'from';
  const recipient = subjectPhrase(event, ctx, options, {
    you: 'you',
    named: (name) => name,
    generic: 'a member',
  });

  return {
    title: `${entityLabel} ${verb}`,
    body: `${entityPhrase} was ${verb} ${preposition} ${recipient}${by}${where}.`,
  };
}

function userRoleMutation(
  event: DomainEvent,
  ctx: NotificationDisplayContext,
  options: RenderNotificationOptions,
  verb: 'assigned' | 'revoked'
): { title: string; body: string | null } {
  const role = ctx.roleName;
  const where = inScope(ctx);
  const by = byActor(ctx);
  const title = role ? `Role "${role}" ${verb}` : `Role ${verb}`;

  if (verb === 'assigned') {
    if (isSubjectRecipient(event, options)) {
      return {
        title,
        body: role
          ? `You were assigned the role "${role}"${by}${where}.`
          : `A role was assigned to you${by}${where}.`,
      };
    }
    const member = ctx.subjectName ?? 'A member';
    return {
      title,
      body: role
        ? `${member} was assigned the role "${role}"${by}${where}.`
        : `${member} was assigned a role${by}${where}.`,
    };
  }

  if (isSubjectRecipient(event, options)) {
    return {
      title,
      body: role
        ? `The role "${role}" was revoked from you${by}${where}.`
        : `A role was revoked from you${by}${where}.`,
    };
  }
  const member = ctx.subjectName ?? 'a member';
  return {
    title,
    body: role
      ? `The role "${role}" was revoked from ${member}${by}${where}.`
      : `A role was revoked from ${member}${by}${where}.`,
  };
}

function membershipMutation(
  event: DomainEvent,
  ctx: NotificationDisplayContext,
  options: RenderNotificationOptions,
  title: string,
  phrases: { you: string; named: (name: string) => string; generic: string }
): { title: string; body: string | null } {
  const where = inScope(ctx);
  const by = byActor(ctx);
  const lead = subjectPhrase(event, ctx, options, phrases);
  return {
    title,
    body: `${lead}${by}${where}.`,
  };
}

function subjectSecurityMutation(
  event: DomainEvent,
  ctx: NotificationDisplayContext,
  options: RenderNotificationOptions,
  title: string,
  phrases: { you: string; named: (name: string) => string; generic: string }
): { title: string; body: string | null } {
  const by = byActor(ctx);
  const lead = subjectPhrase(event, ctx, options, phrases);
  return {
    title,
    body: `${lead}${by}.`,
  };
}

function subjectPhrase(
  event: DomainEvent,
  ctx: NotificationDisplayContext,
  options: RenderNotificationOptions,
  phrases: { you: string; named: (name: string) => string; generic: string }
): string {
  if (isSubjectRecipient(event, options)) return phrases.you;
  if (ctx.subjectName) return phrases.named(ctx.subjectName);
  return phrases.generic;
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

function humanizeType(type: string): string {
  return type.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
