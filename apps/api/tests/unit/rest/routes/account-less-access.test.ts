/**
 * The REST twin of tests/unit/graphql/account-less-access.test.ts. A user who owns no
 * account can be signed in on a closed install, so every account-scoped REST route has
 * to carry the permission guard (`authorizeRestRoute`), which is what refuses them.
 *
 * Guards are recorded by stand-ins and read back off the routers, so what is asserted is
 * the wiring of each route. Every route outside the explicit lists below must be guarded;
 * a new route that is neither guarded nor listed fails, so an unguarded or user-scoped
 * route is added on purpose. The refusal itself, through the real guard, is in
 * account-less-access.refusal.test.ts.
 */
import { describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '@/types';

type Tagged = ((...args: unknown[]) => void) & { __guard?: string };

vi.mock('@/lib/authorization', () => {
  const tag = (guard: string): Tagged => {
    const handler: Tagged = () => undefined;
    handler.__guard = guard;
    return handler;
  };
  return {
    authorizeRestRoute: () => tag('authorize'),
    authenticateRestRoute: tag('authenticate'),
    requireEmailThenMfaRest: () => tag('emailThenMfa'),
    requireEmailVerificationRest: () => tag('email'),
    requireMfaRest: () => tag('mfa'),
  };
});

const { createApiKeysRoutes } = await import('@/rest/routes/api-keys.routes');
const { createAuthRoutes } = await import('@/rest/routes/auth.routes');
const { createConfigRoutes } = await import('@/rest/routes/config.routes');
const { createGroupsRouter } = await import('@/rest/routes/groups.routes');
const { createMeRouter } = await import('@/rest/routes/me.routes');
const { createOrganizationInvitationsRoutes } =
  await import('@/rest/routes/organization-invitations.routes');
const { createOrganizationMembersRoutes } =
  await import('@/rest/routes/organization-members.routes');
const { createOrganizationRoutes } = await import('@/rest/routes/organizations.routes');
const { createPermissionsRouter } = await import('@/rest/routes/permissions.routes');
const { createProjectAppsRouter } = await import('@/rest/routes/project-apps.routes');
const { createProjectOAuthConnectionsRoutes } =
  await import('@/rest/routes/project-oauth-connections.routes');
const { createProjectsRouter } = await import('@/rest/routes/projects.routes');
const { createResourcesRouter } = await import('@/rest/routes/resources.routes');
const { createRolesRouter } = await import('@/rest/routes/roles.routes');
const { createSigningKeysRoutes } = await import('@/rest/routes/signing-keys.routes');
const { createTagsRouter } = await import('@/rest/routes/tags.routes');
const { createUserRoutes } = await import('@/rest/routes/users.routes');
const { createWebhookSubscriptionsRoutes } =
  await import('@/rest/routes/webhook-subscriptions.routes');
const { createRestRouter } = await import('@/rest');

const context = {} as RequestContext;

/** The mounts of `createRestRouter`, in `src/rest/index.ts` order. */
const MOUNTS: Array<[string, () => unknown]> = [
  ['/config', () => createConfigRoutes()],
  ['/api-keys', () => createApiKeysRoutes(context)],
  ['/auth', () => createAuthRoutes(context)],
  ['/signing-keys', () => createSigningKeysRoutes(context)],
  ['/me', () => createMeRouter(context)],
  ['/groups', () => createGroupsRouter(context)],
  ['/organization-invitations', () => createOrganizationInvitationsRoutes(context)],
  ['/organization-members', () => createOrganizationMembersRoutes(context)],
  ['/organizations', () => createOrganizationRoutes(context)],
  ['/permissions', () => createPermissionsRouter(context)],
  ['/project-apps', () => createProjectAppsRouter(context)],
  ['/project-oauth-connections', () => createProjectOAuthConnectionsRoutes(context)],
  ['/projects', () => createProjectsRouter(context)],
  ['/resources', () => createResourcesRouter(context)],
  ['/roles', () => createRolesRouter(context)],
  ['/tags', () => createTagsRouter(context)],
  ['/users', () => createUserRoutes(context)],
  ['/webhook-subscriptions', () => createWebhookSubscriptionsRoutes(context)],
];

/** Routes that need no session: sign-in, registration, the OAuth dance, public config. */
const PUBLIC_ROUTES = [
  'GET /config',
  'POST /auth/login',
  'POST /auth/register',
  'POST /auth/refresh',
  'POST /auth/verify-email',
  'POST /auth/resend-verification',
  'POST /auth/request-password-reset',
  'POST /auth/reset-password',
  'GET /auth/providers',
  'GET /auth/github',
  'GET /auth/github/callback',
  'GET /auth/google',
  'GET /auth/google/callback',
  'POST /auth/cli-callback',
  'POST /auth/token',
  'GET /auth/project/authorize',
  'POST /auth/project/email/request',
  'POST /auth/project/password',
  'POST /auth/project/password/mfa',
  'GET /auth/project/callback',
  'GET /auth/project/app-info',
  'GET /auth/project/consent-info',
  'POST /auth/project/consent/approve',
  'POST /auth/project/token',
  'POST /auth/project/consent/deny',
  'POST /me/logout',
];

/** Operations on the caller's own identity: session user id, no scope. */
const USER_SCOPED_ROUTES = [
  'POST /auth/mfa/setup',
  'POST /auth/mfa/verify',
  'POST /auth/mfa/recovery/verify',
  'POST /auth/is-authorized',
  'GET /me',
  'POST /me/accounts',
  'DELETE /me/accounts',
  'GET /me/export',
  'POST /me/picture',
  'POST /me/picture/upload-url',
  'POST /me/picture/confirm',
  'GET /me/authentication-methods',
  'GET /me/mfa/recovery-codes/status',
  'POST /me/authentication-methods',
  'POST /me/change-password',
  'GET /me/sessions',
  'DELETE /me/sessions/:sessionId',
  'GET /me/notifications',
  'GET /me/notifications/unread-count',
  'POST /me/notifications/read-all',
  'POST /me/notifications/:id/read',
  'GET /me/notification-preferences',
  'PUT /me/notification-preferences',
  'GET /me/project-memberships',
  'GET /me/project-memberships/:projectId',
  'PATCH /me/project-memberships/:projectId',
];

/** Authorized by the invitation token, not by RBAC: the user is not a member yet. */
const TOKEN_AUTHORIZED_ROUTES = ['POST /organization-invitations/accept'];

interface RouteEntry {
  label: string;
  guards: string[];
}

interface RouterLike {
  stack: Array<{
    route?: {
      path: string;
      methods: Record<string, boolean>;
      stack: Array<{ handle: Tagged }>;
    };
  }>;
}

function routesOf(prefix: string, router: unknown): RouteEntry[] {
  return (router as RouterLike).stack.flatMap((layer) => {
    if (!layer.route) return [];
    const path = layer.route.path === '/' ? '' : layer.route.path;
    const guards = layer.route.stack
      .map((entry) => entry.handle.__guard)
      .filter((guard): guard is string => guard !== undefined);
    return Object.keys(layer.route.methods).map((method) => ({
      label: `${method.toUpperCase()} ${prefix}${path}`,
      guards,
    }));
  });
}

const routes = MOUNTS.flatMap(([prefix, build]) => routesOf(prefix, build()));
const listed = [...PUBLIC_ROUTES, ...USER_SCOPED_ROUTES, ...TOKEN_AUTHORIZED_ROUTES];
const scoped = routes.filter((route) => !listed.includes(route.label));

describe('the route lists match the routers', () => {
  it('covers every router mounted by createRestRouter', () => {
    const mounted = (createRestRouter(context) as unknown as { stack: Array<{ name: string }> })
      .stack;
    expect(mounted.filter((layer) => layer.name === 'router')).toHaveLength(MOUNTS.length);
  });

  it('only lists routes that exist', () => {
    const labels = routes.map((route) => route.label);
    for (const label of listed) {
      expect(labels, `${label} is listed but not registered`).toContain(label);
    }
  });

  it('has account-scoped routes to check', () => {
    expect(scoped.length).toBeGreaterThan(80);
  });
});

describe('account-scoped routes', () => {
  it.each(scoped.map((route) => [route.label, route.guards] as const))(
    '%s carries the permission guard',
    (_label, guards) => {
      expect(guards).toContain('authorize');
    }
  );
});

describe('user-scoped routes', () => {
  it.each(
    routes
      .filter((route) => USER_SCOPED_ROUTES.includes(route.label))
      .map((route) => [route.label, route.guards] as const)
  )('%s requires a session', (_label, guards) => {
    expect(guards).toContain('authenticate');
  });
});

describe('token-authorized routes', () => {
  it.each(
    routes
      .filter((route) => TOKEN_AUTHORIZED_ROUTES.includes(route.label))
      .map((route) => [route.label, route.guards] as const)
  )('%s is behind the email and MFA gate', (_label, guards) => {
    expect(guards).toContain('emailThenMfa');
  });
});
