import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Organization, OrganizationSortInput } from '@grantjs/schema';
import { Response, Router } from 'express';

import { authorizeRestRoute, requireEmailThenMfaRest } from '@/lib/authorization';
import { AuthenticationError } from '@/lib/errors';
import { validate } from '@/middleware/validation.middleware';
import {
  confirmOrganizationPictureUploadRequestSchema,
  createOrganizationRequestSchema,
  deleteOrganizationQuerySchema,
  getOrganizationsQuerySchema,
  organizationParamsSchema,
  requestOrganizationPictureUploadUrlRequestSchema,
  updateOrganizationRequestSchema,
  uploadOrganizationPictureRequestSchema,
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
    requireEmailThenMfaRest({ allowPersonalContext: false }, { allowPersonalContext: false }),
    authorizeRestRoute({
      resource: ResourceSlug.Organization,
      action: ResourceAction.Create,
    }),
    async (req: TypedRequest<{ body: typeof createOrganizationRequestSchema }>, res: Response) => {
      const { name, scope } = req.body;
      const userId = context.user?.userId;

      if (!userId) {
        throw new AuthenticationError('Authentication required');
      }

      const organization = await context.handlers.organizations.createOrganization(
        {
          input: { name, scope },
        },
        userId
      );

      context.requestLogger.info({
        msg: 'Organization created',
        organizationId: organization.id,
      });
      sendSuccessResponse(res, organization, 201);
    }
  );

  router.patch(
    '/:id',
    validate({ params: organizationParamsSchema, body: updateOrganizationRequestSchema }),
    requireEmailThenMfaRest({ allowPersonalContext: false }, { allowPersonalContext: false }),
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

  router.post(
    '/:id/picture',
    validate({
      params: organizationParamsSchema,
      body: uploadOrganizationPictureRequestSchema,
    }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    requireEmailThenMfaRest({ allowPersonalContext: false }, { allowPersonalContext: false }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    authorizeRestRoute({
      resource: ResourceSlug.Organization,
      action: ResourceAction.UploadPicture,
    }),
    async (
      req: TypedRequest<{
        params: typeof organizationParamsSchema;
        body: typeof uploadOrganizationPictureRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { file, filename, contentType, scope } = req.body;

      const result = await context.handlers.organizations.uploadOrganizationPicture({
        organizationId: id,
        file,
        filename,
        contentType,
        scope,
      });

      sendSuccessResponse(res, result, 201);
    }
  );

  router.post(
    '/:id/picture/upload-url',
    validate({
      params: organizationParamsSchema,
      body: requestOrganizationPictureUploadUrlRequestSchema,
    }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    requireEmailThenMfaRest({ allowPersonalContext: false }, { allowPersonalContext: false }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    authorizeRestRoute({
      resource: ResourceSlug.Organization,
      action: ResourceAction.UploadPicture,
    }),
    async (
      req: TypedRequest<{
        params: typeof organizationParamsSchema;
        body: typeof requestOrganizationPictureUploadUrlRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { filename, contentType, contentLength, scope } = req.body;
      const result = await context.handlers.organizations.requestOrganizationPictureUploadUrl({
        organizationId: id,
        filename,
        contentType,
        contentLength,
        scope,
      });
      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/:id/picture/confirm',
    validate({
      params: organizationParamsSchema,
      body: confirmOrganizationPictureUploadRequestSchema,
    }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    requireEmailThenMfaRest({ allowPersonalContext: false }, { allowPersonalContext: false }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    authorizeRestRoute({
      resource: ResourceSlug.Organization,
      action: ResourceAction.UploadPicture,
    }),
    async (
      req: TypedRequest<{
        params: typeof organizationParamsSchema;
        body: typeof confirmOrganizationPictureUploadRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { filename, scope } = req.body;
      const result = await context.handlers.organizations.confirmOrganizationPictureUpload({
        organizationId: id,
        filename,
        scope,
      });
      sendSuccessResponse(res, result, 201);
    }
  );

  router.delete(
    '/:id',
    validate({ params: organizationParamsSchema, query: deleteOrganizationQuerySchema }),
    requireEmailThenMfaRest({ allowPersonalContext: false }, { allowPersonalContext: false }),
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
