import {
  CreateRoleMutationVariables,
  DeleteRoleMutationVariables,
  Role,
  UpdateRoleMutationVariables,
} from '@logusgraphics/grant-schema';
import { Response } from 'express';

import { parseRelations } from '@/lib/field-selection.lib';
import {
  createRoleRequestSchema,
  deleteRoleQuerySchema,
  getRolesQuerySchema,
  roleParamsSchema,
  updateRoleRequestSchema,
} from '@/rest/schemas';
import {
  TypedRequest,
  TypedRequestBody,
  TypedRequestParams,
  TypedRequestQuery,
} from '@/rest/types';
import { RequestContext } from '@/types';

import { BaseController } from './base.controller';

export class RolesController extends BaseController {
  constructor(context: RequestContext) {
    super(context);
  }

  async getRoles(
    req: TypedRequest<TypedRequestQuery<typeof getRolesQuerySchema>>,
    res: Response
  ): Promise<void> {
    const { page, limit, search, sortField, sortOrder, tagIds, scopeId, tenant, relations } =
      req.query;

    const requestedFields = parseRelations<Role>(relations);

    const result = await this.handlers.roles.getRoles({
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

  async createRole(
    req: TypedRequest<TypedRequestBody<typeof createRoleRequestSchema>>,
    res: Response
  ): Promise<void> {
    const variables: CreateRoleMutationVariables = {
      input: req.body,
    };

    const role: Role = await this.handlers.roles.createRole(variables);

    this.success(res, role, 201);
  }

  async updateRole(
    req: TypedRequest<
      TypedRequestBody<typeof updateRoleRequestSchema> & TypedRequestParams<typeof roleParamsSchema>
    >,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const variables: UpdateRoleMutationVariables = {
      id,
      input: req.body,
    };

    const role: Role = await this.handlers.roles.updateRole(variables);

    this.success(res, role);
  }

  async deleteRole(
    req: TypedRequest<
      TypedRequestParams<typeof roleParamsSchema> & TypedRequestQuery<typeof deleteRoleQuerySchema>
    >,
    res: Response
  ): Promise<void> {
    const { id } = req.params;
    const { scopeId, tenant } = req.query;

    const variables: DeleteRoleMutationVariables = {
      id,
      scope: { id: scopeId, tenant },
    };

    const role: Role = await this.handlers.roles.deleteRole(variables);

    this.success(res, role);
  }
}
