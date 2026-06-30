import type { DomainEvent, EventType } from '@grantjs/schema';

export interface RenderedNotification {
  title: string;
  body: string | null;
  refEntity: string | null;
  refId: string | null;
}

type Renderer = (event: DomainEvent) => { title: string; body: string | null };

const RENDERERS: Partial<Record<EventType, Renderer>> = {
  'role.created': (e) => ({
    title: 'New role created',
    body: roleName(e) ? `Role "${roleName(e)}" was created.` : 'A role was created.',
  }),
  'permission.updated': () => ({
    title: 'Permission updated',
    body: 'A permission was updated.',
  }),
  'api_key.created': () => ({ title: 'API key created', body: 'A new API key was created.' }),
  'api_key.rotated': () => ({ title: 'API key rotated', body: 'An API key was rotated.' }),
  'api_key.revoked': () => ({ title: 'API key revoked', body: 'An API key was revoked.' }),
  'user.role_assigned': () => ({ title: 'Role assigned', body: 'A role was assigned to you.' }),
  'user.role_revoked': () => ({ title: 'Role revoked', body: 'A role was revoked from you.' }),
  'organization.invitation_sent': () => ({
    title: 'You have an invitation',
    body: 'You were invited to join an organization.',
  }),
  'user.email_verification_requested': () => ({
    title: 'Verify your email',
    body: 'Please verify your email address.',
  }),
  'organization.mfa_enforcement_changed': () => ({
    title: 'MFA policy changed',
    body: 'Your organization updated its MFA enforcement policy.',
  }),
};

function roleName(event: DomainEvent): string | undefined {
  const after = event.data.after as { name?: string } | null | undefined;
  return after?.name;
}

export function renderNotification(event: DomainEvent): RenderedNotification {
  const renderer = RENDERERS[event.type];
  const rendered = renderer ? renderer(event) : { title: humanizeType(event.type), body: null };
  return {
    title: rendered.title,
    body: rendered.body,
    refEntity: event.aggregate?.kind ?? null,
    refId: event.aggregate?.id ?? null,
  };
}

function humanizeType(type: string): string {
  return type.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
