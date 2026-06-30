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
import { createProjectsRouter } from '@/rest/routes/projects.routes';
import { createResourcesRouter } from '@/rest/routes/resources.routes';
import { createRolesRouter } from '@/rest/routes/roles.routes';
import { createSigningKeysRoutes } from '@/rest/routes/signing-keys.routes';
import { createTagsRouter } from '@/rest/routes/tags.routes';
import { createUserRoutes } from '@/rest/routes/users.routes';
import { createWebhookSubscriptionsRoutes } from '@/rest/routes/webhook-subscriptions.routes';
import { RequestContext } from '@/types';

export function createRestRouter(context: RequestContext): Router {
  const router = Router();

  router.use(minAalAtLoginRestMiddleware);

  router.use('/config', createConfigRoutes());
  router.use('/api-keys', createApiKeysRoutes(context));
  router.use('/auth', createAuthRoutes(context));
  router.use('/signing-keys', createSigningKeysRoutes(context));
  router.use('/me', createMeRouter(context));
  router.use('/groups', createGroupsRouter(context));
  router.use('/organization-invitations', createOrganizationInvitationsRoutes(context));
  router.use('/organization-members', createOrganizationMembersRoutes(context));
  router.use('/organizations', createOrganizationRoutes(context));
  router.use('/permissions', createPermissionsRouter(context));
  router.use('/project-apps', createProjectAppsRouter(context));
  router.use('/projects', createProjectsRouter(context));
  router.use('/resources', createResourcesRouter(context));
  router.use('/roles', createRolesRouter(context));
  router.use('/tags', createTagsRouter(context));
  router.use('/users', createUserRoutes(context));
  router.use('/webhook-subscriptions', createWebhookSubscriptionsRoutes(context));

  return router;
}
