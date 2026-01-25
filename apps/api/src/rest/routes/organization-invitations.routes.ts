import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import {
  OrganizationInvitation,
  OrganizationInvitationSortInput,
  OrganizationInvitationStatus,
  QueryOrganizationInvitationsArgs,
  SortOrder,
} from '@grantjs/schema';
import { Response, Router } from 'express';

import { authorizeRestRoute } from '@/lib/authorization';
import { NotFoundError } from '@/lib/errors';
import { parseRelations } from '@/lib/field-selection.lib';
import { validate } from '@/middleware/validation.middleware';
import {
  acceptInvitationRequestSchema,
  getInvitationByTokenQuerySchema,
  getOrganizationInvitationsQuerySchema,
  invitationActionBodySchema,
  invitationParamsSchema,
  invitationTokenParamsSchema,
  inviteMemberRequestSchema,
} from '@/rest/schemas/organization-invitations.schemas';
import { TypedRequest } from '@/rest/types';
import { queryListCommons } from '@/rest/utils/list-query';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createOrganizationInvitationsRoutes(context: RequestContext) {
  const router = Router();

  router.post(
    '/invite',
    validate({ body: inviteMemberRequestSchema }),
    authorizeRestRoute({
      resource: ResourceSlug.OrganizationInvitation,
      action: ResourceAction.Create,
    }),
    async (req: TypedRequest<{ body: typeof inviteMemberRequestSchema }>, res: Response) => {
      const { scope, email, roleId } = req.body;

      const invitation = await context.handlers.organizationInvitations.inviteMember(
        { scope, email, roleId },
        context.locale
      );

      sendSuccessResponse(res, invitation, 201);
    }
  );

  router.post(
    '/accept',
    validate({ body: acceptInvitationRequestSchema }),
    authorizeRestRoute({
      resource: ResourceSlug.OrganizationInvitation,
      action: ResourceAction.Accept,
    }),
    async (req: TypedRequest<{ body: typeof acceptInvitationRequestSchema }>, res: Response) => {
      const { scope, token, userData } = req.body;

      const result = await context.handlers.organizationInvitations.acceptInvitation({
        scope,
        token,
        userData,
      });

      sendSuccessResponse(res, result);
    }
  );

  router.get(
    '/:token',
    validate({ params: invitationTokenParamsSchema, query: getInvitationByTokenQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.OrganizationInvitation,
      action: ResourceAction.Read,
    }),
    async (
      req: TypedRequest<{
        params: typeof invitationTokenParamsSchema;
        query: typeof getInvitationByTokenQuerySchema;
      }>,
      res: Response
    ) => {
      const { token } = req.params;
      const { relations } = req.query;

      const requestedFields = parseRelations<OrganizationInvitation>(relations);

      const invitation = await context.handlers.organizationInvitations.getInvitation({
        token,
        requestedFields,
      });

      if (!invitation) {
        throw new NotFoundError('Invitation not found or has expired', 'errors:auth.invalidToken');
      }

      sendSuccessResponse(res, invitation);
    }
  );

  router.get(
    '/',
    validate({ query: getOrganizationInvitationsQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.OrganizationInvitation,
      action: ResourceAction.Query,
    }),
    async (
      req: TypedRequest<{ query: typeof getOrganizationInvitationsQuerySchema }>,
      res: Response
    ) => {
      const { scopeId, tenant, status, page, limit, search, sortField, sortOrder, ids } = req.query;

      const { sort, scope } = queryListCommons<
        OrganizationInvitation,
        OrganizationInvitationSortInput
      >({
        sortField,
        sortOrder: sortOrder ? (sortOrder.toUpperCase() as SortOrder) : undefined,
        scopeId,
        tenant,
      });

      const params = {
        scope: scope!,
        status: status as OrganizationInvitationStatus | undefined,
        page,
        limit,
        search,
        sort,
        ids,
      } as QueryOrganizationInvitationsArgs;

      const result =
        await context.handlers.organizationInvitations.getOrganizationInvitations(params);

      sendSuccessResponse(res, {
        items: result.invitations,
        totalCount: result.totalCount,
        hasNextPage: result.hasNextPage,
      });
    }
  );

  router.post(
    '/:id/resend-email',
    validate({ params: invitationParamsSchema, body: invitationActionBodySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.OrganizationInvitation,
      action: ResourceAction.ResendEmail,
    }),
    async (
      req: TypedRequest<{
        params: typeof invitationParamsSchema;
        body: typeof invitationActionBodySchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;

      const invitation = await context.handlers.organizationInvitations.resendInvitationEmail(
        id,
        context.locale
      );

      sendSuccessResponse(res, invitation);
    }
  );

  router.post(
    '/:id/renew',
    validate({ params: invitationParamsSchema, body: invitationActionBodySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.OrganizationInvitation,
      action: ResourceAction.Renew,
    }),
    async (
      req: TypedRequest<{
        params: typeof invitationParamsSchema;
        body: typeof invitationActionBodySchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;

      const invitation = await context.handlers.organizationInvitations.renewInvitation(
        id,
        context.locale
      );

      sendSuccessResponse(res, invitation);
    }
  );

  router.delete(
    '/:id',
    validate({ params: invitationParamsSchema, body: invitationActionBodySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.OrganizationInvitation,
      action: ResourceAction.Revoke,
    }),
    async (
      req: TypedRequest<{
        params: typeof invitationParamsSchema;
        body: typeof invitationActionBodySchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;

      const invitation = await context.handlers.organizationInvitations.revokeInvitation(id);

      sendSuccessResponse(res, invitation);
    }
  );

  return router;
}
