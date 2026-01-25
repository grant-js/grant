import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import {
  OrganizationInvitationStatus,
  OrganizationMember,
  OrganizationMemberSortInput,
  QueryOrganizationMembersArgs,
  SortOrder,
} from '@grantjs/schema';
import { Response, Router } from 'express';

import { authorizeRestRoute } from '@/lib/authorization';
import { validate } from '@/middleware/validation.middleware';
import {
  getOrganizationMembersQuerySchema,
  removeOrganizationMemberBodySchema,
  removeOrganizationMemberParamsSchema,
  updateOrganizationMemberBodySchema,
  updateOrganizationMemberParamsSchema,
} from '@/rest/schemas/organization-members.schemas';
import { TypedRequest } from '@/rest/types';
import { queryListCommons } from '@/rest/utils/list-query';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createOrganizationMembersRoutes(context: RequestContext) {
  const router = Router();

  router.get(
    '/',
    validate({ query: getOrganizationMembersQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.OrganizationMember,
      action: ResourceAction.Query,
    }),
    async (
      req: TypedRequest<{ query: typeof getOrganizationMembersQuerySchema }>,
      res: Response
    ) => {
      const { scopeId, tenant, status, page, limit, search, sortField, sortOrder } = req.query;

      const { sort, scope } = queryListCommons<OrganizationMember, OrganizationMemberSortInput>({
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
      } as QueryOrganizationMembersArgs;

      const result = await context.handlers.organizationMembers.getOrganizationMembers(params);

      sendSuccessResponse(res, {
        items: result.members,
        totalCount: result.totalCount,
        hasNextPage: result.hasNextPage,
      });
    }
  );

  router.patch(
    '/:userId',
    validate({
      params: updateOrganizationMemberParamsSchema,
      body: updateOrganizationMemberBodySchema,
    }),
    authorizeRestRoute({
      resource: ResourceSlug.OrganizationMember,
      action: ResourceAction.Update,
    }),
    async (
      req: TypedRequest<{
        params: typeof updateOrganizationMemberParamsSchema;
        body: typeof updateOrganizationMemberBodySchema;
      }>,
      res: Response
    ) => {
      const { userId } = req.params;
      const { scope, roleId } = req.body;

      const result = await context.handlers.organizationMembers.updateOrganizationMember({
        userId,
        input: { scope, roleId },
      });

      sendSuccessResponse(res, result);
    }
  );

  router.delete(
    '/:userId',
    validate({
      params: removeOrganizationMemberParamsSchema,
      body: removeOrganizationMemberBodySchema,
    }),
    authorizeRestRoute({
      resource: ResourceSlug.OrganizationMember,
      action: ResourceAction.Remove,
    }),
    async (
      req: TypedRequest<{
        params: typeof removeOrganizationMemberParamsSchema;
        body: typeof removeOrganizationMemberBodySchema;
      }>,
      res: Response
    ) => {
      const { userId } = req.params;
      const { scope } = req.body;

      const result = await context.handlers.organizationMembers.removeOrganizationMember({
        userId,
        input: { scope },
      });

      sendSuccessResponse(res, result);
    }
  );

  return router;
}
