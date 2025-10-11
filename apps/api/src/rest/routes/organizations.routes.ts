import { Router } from 'express';

import { validate } from '@/middleware/validation.middleware';
import { OrganizationsController } from '@/rest/controllers/organizations.controller';
import {
  createOrganizationRequestSchema,
  deleteOrganizationQuerySchema,
  getOrganizationsQuerySchema,
  organizationParamsSchema,
  updateOrganizationRequestSchema,
} from '@/rest/schemas/organizations.schemas';
import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

export function createOrganizationRoutes(context: RequestContext) {
  const router = Router();
  const organizationsController = new OrganizationsController(context);

  /**
   * GET /api/organizations
   * List organizations with optional filtering and relations
   */
  router.get('/', validate({ query: getOrganizationsQuerySchema }), (req, res) =>
    organizationsController.getOrganizations(
      req as TypedRequest<{ query: typeof getOrganizationsQuerySchema }>,
      res
    )
  );

  /**
   * GET /api/organizations/:id
   * Get a single organization by ID with optional relations
   */
  router.get(
    '/:id',
    validate({ params: organizationParamsSchema, query: getOrganizationsQuerySchema }),
    (req, res) =>
      organizationsController.getOrganization(
        req as TypedRequest<{
          params: typeof organizationParamsSchema;
          query: typeof getOrganizationsQuerySchema;
        }>,
        res
      )
  );

  /**
   * POST /api/organizations
   * Create a new organization
   */
  router.post('/', validate({ body: createOrganizationRequestSchema }), (req, res) =>
    organizationsController.createOrganization(
      req as TypedRequest<{ body: typeof createOrganizationRequestSchema }>,
      res
    )
  );

  /**
   * PATCH /api/organizations/:id
   * Update an existing organization
   */
  router.patch(
    '/:id',
    validate({ params: organizationParamsSchema, body: updateOrganizationRequestSchema }),
    (req, res) =>
      organizationsController.updateOrganization(
        req as TypedRequest<{
          params: typeof organizationParamsSchema;
          body: typeof updateOrganizationRequestSchema;
        }>,
        res
      )
  );

  /**
   * DELETE /api/organizations/:id
   * Delete an organization (soft or hard delete)
   */
  router.delete(
    '/:id',
    validate({ params: organizationParamsSchema, query: deleteOrganizationQuerySchema }),
    (req, res) =>
      organizationsController.deleteOrganization(
        req as TypedRequest<{
          params: typeof organizationParamsSchema;
          query: typeof deleteOrganizationQuerySchema;
        }>,
        res
      )
  );

  return router;
}
