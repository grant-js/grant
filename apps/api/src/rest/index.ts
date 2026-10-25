import { Router } from 'express';

import { minAalAtLoginRestMiddleware } from '@/lib/authorization/min-aal-at-login';
import { createApiKeysRoutes } from '@/rest/routes/api-keys.routes';
import { createAuthRoutes } from '@/rest/routes/auth.routes';
import { createConfigRoutes } from '@/rest/routes/config.routes';
import { createGroupsRouter } from '@/rest/routes/groups.routes';
import { createMeRouter } from '@/rest/routes/me.routes';
import { createOrganizationInvitationsRoutes } from '@/rest/routes/organization-invitations.routes';
import { createOrganizationMembersRoutes } from '@/rest/routes/organization-members.routes';
import { createOrganizationRoutes } from '@/rest/routes/organizations.routes';
import { createPermissionsRouter } from '@/rest/routes/permissions.routes';
import { createProjectAppsRouter } from '@/rest/routes/project-apps.routes';
import { createProjectOAuthConnectionsRoutes } from '@/rest/routes/project-oauth-connections.routes';
import { createProjectsRouter } from '@/rest/routes/projects.routes';
import { createResourcesRouter } from '@/rest/routes/resources.routes';
import { createRolesRouter } from '@/rest/routes/roles.routes';
import { createSigningKeysRoutes } from '@/rest/routes/signing-keys.routes';
import { createTagsRouter } from '@/rest/routes/tags.routes';
import { createUserRoutes } from '@/rest/routes/users.routes';
import { createWebhookSubscriptionsRoutes } from '@/rest/routes/webhook-subscriptions.routes';

export function createRestRouter(): Router {
  const router = Router();

  router.use(minAalAtLoginRestMiddleware);

  router.use('/config', createConfigRoutes());
  router.use('/api-keys', createApiKeysRoutes());
  router.use('/auth', createAuthRoutes());
  router.use('/signing-keys', createSigningKeysRoutes());
  router.use('/me', createMeRouter());
  router.use('/groups', createGroupsRouter());
  router.use('/organization-invitations', createOrganizationInvitationsRoutes());
  router.use('/organization-members', createOrganizationMembersRoutes());
  router.use('/organizations', createOrganizationRoutes());
  router.use('/permissions', createPermissionsRouter());
  router.use('/project-apps', createProjectAppsRouter());
  router.use('/project-oauth-connections', createProjectOAuthConnectionsRoutes());
  router.use('/projects', createProjectsRouter());
  router.use('/resources', createResourcesRouter());
  router.use('/roles', createRolesRouter());
  router.use('/tags', createTagsRouter());
  router.use('/users', createUserRoutes());
  router.use('/webhook-subscriptions', createWebhookSubscriptionsRoutes());

  return router;
}
