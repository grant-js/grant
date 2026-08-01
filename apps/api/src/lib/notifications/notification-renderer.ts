import type { DomainEvent, EventType } from '@grantjs/schema';

import type { NotificationDisplayContext } from './notification-display-context';

export interface RenderedNotification {
  title: string;
  body: string | null;
  refEntity: string | null;
  refId: string | null;
}

type Renderer = (
  event: DomainEvent,
  ctx: NotificationDisplayContext
) => { title: string; body: string | null };

const EMPTY_CONTEXT: NotificationDisplayContext = {
  actorName: null,
  scopeName: null,
  roleName: null,
  entityName: null,
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
  'user.permission_assigned': (_e, ctx) => subjectAssignmentMutation(ctx, 'Permission', 'assigned'),
  'user.permission_revoked': (_e, ctx) => subjectAssignmentMutation(ctx, 'Permission', 'revoked'),
  'group.permission_assigned': (_e, ctx) =>
    assignmentMutation(ctx, 'Permission', 'assigned', 'group'),
  'group.permission_revoked': (_e, ctx) =>
    assignmentMutation(ctx, 'Permission', 'revoked', 'group'),
  'role.group_assigned': (_e, ctx) => assignmentMutation(ctx, 'Group', 'assigned', 'role'),
  'role.group_revoked': (_e, ctx) => assignmentMutation(ctx, 'Group', 'revoked', 'role'),
  'user.group_assigned': (_e, ctx) => subjectAssignmentMutation(ctx, 'Group', 'assigned'),
  'user.group_revoked': (_e, ctx) => subjectAssignmentMutation(ctx, 'Group', 'revoked'),
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
  'user.role_assigned': (_e, ctx) => {
    const role = ctx.roleName;
    return {
      title: role ? `Role "${role}" assigned` : 'Role assigned',
      body: role
        ? `You were assigned the role "${role}"${byActor(ctx)}${inScope(ctx)}.`
        : `A role was assigned to you${byActor(ctx)}${inScope(ctx)}.`,
    };
  },
  'user.role_revoked': (_e, ctx) => {
    const role = ctx.roleName;
    return {
      title: role ? `Role "${role}" revoked` : 'Role revoked',
      body: role
        ? `The role "${role}" was revoked from you${byActor(ctx)}${inScope(ctx)}.`
        : `A role was revoked from you${byActor(ctx)}${inScope(ctx)}.`,
    };
  },
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
  'organization.member_added': (_e, ctx) => membershipMutation(ctx, 'Member added', 'joined'),
  'organization.member_role_changed': (_e, ctx) =>
    membershipMutation(ctx, 'Member role changed', 'had their role changed'),
  'organization.member_removed': (_e, ctx) =>
    membershipMutation(ctx, 'Member removed', 'was removed'),
  'project.user_added': (_e, ctx) =>
    membershipMutation(ctx, 'Project member added', 'was added to the project'),
  'project.user_removed': (_e, ctx) =>
    membershipMutation(ctx, 'Project member removed', 'was removed from the project'),
  'project.user_profile_updated': (_e, ctx) =>
    membershipMutation(ctx, 'Project profile updated', 'updated their project profile'),
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
  ctx: NotificationDisplayContext = EMPTY_CONTEXT
): RenderedNotification {
  const renderer = RENDERERS[event.type];
  const rendered = renderer
    ? renderer(event, ctx)
    : { title: humanizeType(event.type), body: null };
  return {
    title: rendered.title,
    body: rendered.body,
    refEntity: event.aggregate?.kind ?? null,
    refId: event.aggregate?.id ?? null,
  };
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
  entityLabel: string,
  verb: 'assigned' | 'revoked',
  target: 'role' | 'group'
): { title: string; body: string | null } {
  const where = inScope(ctx);
  const by = byActor(ctx);
  const targetLabel = target === 'role' ? 'a role' : 'a group';
  return {
    title: `${entityLabel} ${verb}`,
    body: `A ${entityLabel.toLowerCase()} was ${verb} ${verb === 'assigned' ? 'to' : 'from'} ${targetLabel}${by}${where}.`,
  };
}

function subjectAssignmentMutation(
  ctx: NotificationDisplayContext,
  entityLabel: string,
  verb: 'assigned' | 'revoked'
): { title: string; body: string | null } {
  const where = inScope(ctx);
  const by = byActor(ctx);
  const lower = entityLabel.toLowerCase();
  return {
    title: `${entityLabel} ${verb}`,
    body:
      verb === 'assigned'
        ? `A ${lower} was assigned to you${by}${where}.`
        : `A ${lower} was revoked from you${by}${where}.`,
  };
}

function membershipMutation(
  ctx: NotificationDisplayContext,
  title: string,
  verbPhrase: string
): { title: string; body: string | null } {
  const where = inScope(ctx);
  const by = byActor(ctx);
  return {
    title,
    body: `A member ${verbPhrase}${by}${where}.`,
  };
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

function humanizeType(type: string): string {
  return type.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
