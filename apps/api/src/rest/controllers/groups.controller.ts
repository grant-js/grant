import { Response } from 'express';

import {
  CreateGroupMutationVariables,
  DeleteGroupMutationVariables,
  Group,
  GroupWithRelations,
  QueryGroupsArgs,
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
  RequestContext,
  TypedRequest,
  TypedRequestBody,
  TypedRequestParams,
  TypedRequestQuery,
} from '@/types';

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

    const requestedFields = parseRelations<GroupWithRelations>(relations);

    try {
      const args: QueryGroupsArgs = {
        pagination: { page, limit },
        search: search || undefined,
        sortBy: sortField || undefined,
        sortOrder: sortOrder || undefined,
        tagIds: tagIds || undefined,
        scope: { scopeId, tenant },
      };

      const result = await req.context.handlers.groups.getGroups(
        args,
        requestedFields || (['id', 'name', 'description'] as any)
      );

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

      const group: Group = await req.context.handlers.groups.createGroup(variables, [
        'id',
        'name',
        'description',
      ] as any);

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

      const group: Group = await req.context.handlers.groups.updateGroup(variables, [
        'id',
        'name',
        'description',
      ] as any);

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
    const { scopeId, tenant, hardDelete } = req.query;

    try {
      const variables: DeleteGroupMutationVariables = {
        id,
        scope: { scopeId, tenant },
        hardDelete: hardDelete || false,
      };

      const group: Group = await req.context.handlers.groups.deleteGroup(variables, [
        'id',
        'name',
      ] as any);

      this.ok(res, group);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete group');
    }
  }
}
