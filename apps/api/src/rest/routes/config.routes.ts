import { Request, Response, Router } from 'express';

import { config } from '@/config';

const router = Router();

/**
 * GET /api/config — Public runtime config for frontends (no auth).
 * Lets CSR apps load deploy-time config at runtime without baking env into images.
 * The frontend still reaches its own API by relative path; the only URL returned is `docsUrl`,
 * the outbound link to the docs site, which may live on another origin (null when `DOCS_URL`
 * is unset, so the frontend falls back to same-origin `/docs`).
 */
router.get('/', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    demoModeEnabled: config.demoMode.enabled,
    demoModeDbRefreshSchedule: config.demoMode.dbRefreshSchedule,
    accountDeletionRetentionDays: String(config.privacy.accountDeletionRetentionDays),
    appVersion: config.app.version,
    // The largest CDM import document this deployment will take by reference, so the web
    // dropzone refuses what the upload URL would refuse instead of carrying its own copy
    // of the number (ADR 0009).
    cdmUploadMaxBytes: config.storage.cdmImport.maxBytes,
    docsUrl: config.app.docsUrl ?? null,
    // Whether the API serves Swagger UI at /api-docs (`SWAGGER_ENABLED`) and the Apollo Sandbox
    // at /graphql (`APOLLO_PLAYGROUND`), so the web header hides a link to a surface that is off.
    apiReferenceEnabled: config.swagger.enabled,
    graphqlPlaygroundEnabled: config.apollo.playground,
  });
});

export function createConfigRoutes(): Router {
  return router;
}
