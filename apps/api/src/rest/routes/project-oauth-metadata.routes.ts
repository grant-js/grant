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

  // codeql[js/missing-rate-limiting]: Public discovery JSON only. Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
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

  // codeql[js/missing-rate-limiting]: Public discovery JSON only. Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
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

  // Public discovery JSON only (RFC 8414 / OIDC twin). Not auth-sensitive.
  // Annotations sit immediately before the handler argument — that is the
  // node CodeQL flags (it treats buildProjectOAuthMetadata as "authorization").
  router.get(
    '/.well-known/oauth-authorization-server/org/:orgId/prj/:projectId',
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    handleOrgProject
  );
  router.get(
    '/.well-known/oauth-authorization-server/acc/:accId/prj/:projectId',
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    handleAccProject
  );
  router.get(
    '/org/:orgId/prj/:projectId/.well-known/openid-configuration',
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    handleOrgProject
  );
  router.get(
    '/acc/:accId/prj/:projectId/.well-known/openid-configuration',
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    handleAccProject
  );

  return router;
}
