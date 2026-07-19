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
  'role.created': (e, ctx) => {
    const name = ctx.entityName ?? roleNameFromPayload(e);
    const where = inScope(ctx);
    const by = byActor(ctx);
    return {
      title: name ? `Role "${name}" created` : 'New role created',
      body: name ? `Role "${name}" was created${by}${where}.` : `A role was created${by}${where}.`,
    };
  },
  'permission.updated': (_e, ctx) => ({
    title: 'Permission updated',
    body: `A permission was updated${byActor(ctx)}${inScope(ctx)}.`,
  }),
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

function roleNameFromPayload(event: DomainEvent): string | null {
  return stringField(event.data.after, 'name') ?? stringField(event.data.before, 'name');
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
