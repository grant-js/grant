import {
  CreateGroupMutationVariables,
  DeleteGroupMutationVariables,
  Group,
  UpdateGroupMutationVariables,
} from '@logusgraphics/grant-schema';
import { Response } from 'express';

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

    const result = await this.handlers.groups.getGroups({
      page,
      limit,
      search: search || undefined,
      sort: sortField && sortOrder ? { field: sortField, order: sortOrder } : undefined,
      tagIds: tagIds || undefined,
      scope: { id: scopeId, tenant },
      requestedFields,
    });

    this.success(res, result);
  }

  async createGroup(
    req: TypedRequest<TypedRequestBody<typeof createGroupRequestSchema>>,
    res: Response
  ): Promise<void> {
    const variables: CreateGroupMutationVariables = {
      input: req.body,
    };

    const group: Group = await this.handlers.groups.createGroup(variables);

    this.success(res, group, 201);
  }

  async updateGroup(
    req: TypedRequest<
      TypedRequestBody<typeof updateGroupRequestSchema> &
        TypedRequestParams<typeof groupParamsSchema>
    >,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const variables: UpdateGroupMutationVariables = {
      id,
      input: req.body,
    };

    const group: Group = await this.handlers.groups.updateGroup(variables);

    this.success(res, group);
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

    const variables: DeleteGroupMutationVariables = {
      id,
      scope: { id: scopeId, tenant },
    };

    const group: Group = await this.handlers.groups.deleteGroup(variables);

    this.success(res, group);
  }
}
