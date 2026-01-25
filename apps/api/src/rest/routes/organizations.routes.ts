import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Organization, OrganizationSortInput } from '@grantjs/schema';
import { Response, Router } from 'express';

import { authorizeRestRoute } from '@/lib/authorization';
import { AuthenticationError } from '@/lib/errors';
import { validate } from '@/middleware/validation.middleware';
import {
  createOrganizationRequestSchema,
  deleteOrganizationQuerySchema,
  getOrganizationsQuerySchema,
  organizationParamsSchema,
  updateOrganizationRequestSchema,
} from '@/rest/schemas/organizations.schemas';
import { TypedRequest } from '@/rest/types';
import { queryListCommons } from '@/rest/utils/list-query';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createOrganizationRoutes(context: RequestContext) {
  const router = Router();

  router.get(
    '/',
    validate({ query: getOrganizationsQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Organization,
      action: ResourceAction.Query,
    }),
    async (req: TypedRequest<{ query: typeof getOrganizationsQuerySchema }>, res: Response) => {
      const { page, limit, search, ids, relations, sortField, sortOrder } = req.query;

      const { requestedFields, sort } = queryListCommons<Organization, OrganizationSortInput>({
        relations,
        sortField,
        sortOrder,
      });

      const result = await context.handlers.organizations.getOrganizations({
        page,
        limit,
        search,
        ids,
        sort,
        requestedFields,
      });

      sendSuccessResponse(res, {
        items: result.organizations,
        totalCount: result.totalCount,
        hasNextPage: result.hasNextPage,
      });
    }
  );

  router.post(
    '/',
    validate({ body: createOrganizationRequestSchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Organization,
      action: ResourceAction.Create,
    }),
    async (req: TypedRequest<{ body: typeof createOrganizationRequestSchema }>, res: Response) => {
      const { name, scope } = req.body;
      const userId = context.user?.userId;

      if (!userId) {
        throw new AuthenticationError('Authentication required', 'errors:auth.unauthorized');
      }

      const organization = await context.handlers.organizations.createOrganization(
        {
          input: { name, scope },
        },
        userId
      );

      sendSuccessResponse(res, organization, 201);
    }
  );

  router.patch(
    '/:id',
    validate({ params: organizationParamsSchema, body: updateOrganizationRequestSchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Organization,
      action: ResourceAction.Update,
    }),
    async (
      req: TypedRequest<{
        params: typeof organizationParamsSchema;
        body: typeof updateOrganizationRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { name, scope } = req.body;

      const organization = await context.handlers.organizations.updateOrganization({
        id,
        input: { name, scope },
      });

      sendSuccessResponse(res, organization);
    }
  );

  router.delete(
    '/:id',
    validate({ params: organizationParamsSchema, query: deleteOrganizationQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Organization,
      action: ResourceAction.Delete,
    }),
    async (
      req: TypedRequest<{
        params: typeof organizationParamsSchema;
        query: typeof deleteOrganizationQuerySchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { hardDelete } = req.query;

      const organization = await context.handlers.organizations.deleteOrganization({
        id,
        hardDelete: hardDelete ?? false,
      });

      sendSuccessResponse(res, organization);
    }
  );

  return router;
}
