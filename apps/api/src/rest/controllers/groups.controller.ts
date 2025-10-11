import { Response } from 'express';

import {
  CreateGroupMutationVariables,
  DeleteGroupMutationVariables,
  Group,
  UpdateGroupMutationVariables,
} from '@logusgraphics/grant-schema';

import { parseRelations } from '@/lib/field-selection.lib';
import {
  createGroupRequestSchema,
  deleteGroupQuerySchema,
  getGroupsQuerySchema,
  groupParamsSchema,
  updateGroupRequestSchema,
} from '@/rest/schemas';
import {
  TypedRequest,
  TypedRequestBody,
  TypedRequestParams,
  TypedRequestQuery,
} from '@/rest/types';
import { RequestContext } from '@/types';

import { BaseController } from './base.controller';

export class GroupsController extends BaseController {
  constructor(context: RequestContext) {
    super(context);
  }

  async getGroups(
    req: TypedRequest<TypedRequestQuery<typeof getGroupsQuerySchema>>,
    res: Response
  ): Promise<void> {
    const { page, limit, search, sortField, sortOrder, tagIds, scopeId, tenant, relations } =
      req.query;

    const requestedFields = parseRelations<Group>(relations);

    try {
      const result = await this.handlers.groups.getGroups({
        page,
        limit,
        search: search || undefined,
        sort: sortField && sortOrder ? { field: sortField, order: sortOrder } : undefined,
        tagIds: tagIds || undefined,
        scope: { id: scopeId, tenant },
        requestedFields: requestedFields || (['id', 'name', 'description'] as any),
      });

      this.ok(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch groups');
    }
  }

  async createGroup(
    req: TypedRequest<TypedRequestBody<typeof createGroupRequestSchema>>,
    res: Response
  ): Promise<void> {
    try {
      const variables: CreateGroupMutationVariables = {
        input: req.body,
      };

      const group: Group = await this.handlers.groups.createGroup(variables);

      this.created(res, group);
    } catch (error) {
      this.handleError(res, error, 'Failed to create group');
    }
  }

  async updateGroup(
    req: TypedRequest<
      TypedRequestBody<typeof updateGroupRequestSchema> &
        TypedRequestParams<typeof groupParamsSchema>
    >,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    try {
      const variables: UpdateGroupMutationVariables = {
        id,
        input: req.body,
      };

      const group: Group = await this.handlers.groups.updateGroup(variables);

      this.ok(res, group);
    } catch (error) {
      this.handleError(res, error, 'Failed to update group');
    }
  }

  async deleteGroup(
    req: TypedRequest<
      TypedRequestParams<typeof groupParamsSchema> &
        TypedRequestQuery<typeof deleteGroupQuerySchema>
    >,
    res: Response
  ): Promise<void> {
    const { id } = req.params;
    const { scopeId, tenant } = req.query;

    try {
      const variables: DeleteGroupMutationVariables = {
        id,
        scope: { id: scopeId, tenant },
      };

      const group: Group = await this.handlers.groups.deleteGroup(variables);

      this.ok(res, group);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete group');
    }
  }
}
