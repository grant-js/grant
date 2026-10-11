import { Tenant } from '@grantjs/schema';
import { Request, Response, Router } from 'express';
import { z } from 'zod';

import { config } from '@/config';
import { buildProjectOAuthMetadata } from '@/lib/project-oauth-metadata.lib';

const uuidParam = z.string().uuid();

function sendMetadata(res: Response, metadata: ReturnType<typeof buildProjectOAuthMetadata>): void {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', `public, max-age=${config.jwt.jwksMaxAgeSeconds}`);
  res.json(metadata);
}

/**
 * RFC 8414 authorization-server metadata and a twin OpenID configuration URL.
 * Both return the same JSON. Grant is not an OpenID Provider (no userinfo / id_token).
 *
 * RFC 8414 inserts well-known *before* the issuer path:
 *   GET /.well-known/oauth-authorization-server/org/:orgId/prj/:projectId
 * Twin:
 *   GET /org/:orgId/prj/:projectId/.well-known/openid-configuration
 */
export function createProjectOAuthMetadataRouter(): Router {
  const router = Router();

  function handleOrgProject(req: Request, res: Response): void {
    const orgId = uuidParam.safeParse(req.params.orgId);
    const projectId = uuidParam.safeParse(req.params.projectId);
    if (!orgId.success || !projectId.success) {
      res.status(404).end();
      return;
    }
    sendMetadata(
      res,
      buildProjectOAuthMetadata({
        tenant: Tenant.OrganizationProject,
        id: `${orgId.data}:${projectId.data}`,
      })
    );
  }

  function handleAccProject(req: Request, res: Response): void {
    const accId = uuidParam.safeParse(req.params.accId);
    const projectId = uuidParam.safeParse(req.params.projectId);
    if (!accId.success || !projectId.success) {
      res.status(404).end();
      return;
    }
    sendMetadata(
      res,
      buildProjectOAuthMetadata({
        tenant: Tenant.AccountProject,
        id: `${accId.data}:${projectId.data}`,
      })
    );
  }

  router.get('/.well-known/oauth-authorization-server/org/:orgId/prj/:projectId', handleOrgProject);
  router.get('/.well-known/oauth-authorization-server/acc/:accId/prj/:projectId', handleAccProject);
  router.get('/org/:orgId/prj/:projectId/.well-known/openid-configuration', handleOrgProject);
  router.get('/acc/:accId/prj/:projectId/.well-known/openid-configuration', handleAccProject);

  return router;
}
