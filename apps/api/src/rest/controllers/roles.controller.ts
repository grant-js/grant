import {
  CreateRoleMutationVariables,
  DeleteRoleMutationVariables,
  Role,
  UpdateRoleMutationVariables,
} from '@logusgraphics/grant-schema';
import { Response } from 'express';

import { BaseController } from './base.controller';

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

    try {
      const result = await this.handlers.roles.getRoles({
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
      this.handleError(res, error, 'Failed to fetch roles');
    }
  }

  async createRole(
    req: TypedRequest<TypedRequestBody<typeof createRoleRequestSchema>>,
    res: Response
  ): Promise<void> {
    try {
      const variables: CreateRoleMutationVariables = {
        input: req.body,
      };

      const role: Role = await this.handlers.roles.createRole(variables);

      this.created(res, role);
    } catch (error) {
      this.handleError(res, error, 'Failed to create role');
    }
  }

  async updateRole(
    req: TypedRequest<
      TypedRequestBody<typeof updateRoleRequestSchema> & TypedRequestParams<typeof roleParamsSchema>
    >,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    try {
      const variables: UpdateRoleMutationVariables = {
        id,
        input: req.body,
      };

      const role: Role = await this.handlers.roles.updateRole(variables);

      this.ok(res, role);
    } catch (error) {
      this.handleError(res, error, 'Failed to update role');
    }
  }

  async deleteRole(
    req: TypedRequest<
      TypedRequestParams<typeof roleParamsSchema> & TypedRequestQuery<typeof deleteRoleQuerySchema>
    >,
    res: Response
  ): Promise<void> {
    const { id } = req.params;
    const { scopeId, tenant } = req.query;

    try {
      const variables: DeleteRoleMutationVariables = {
        id,
        scope: { id: scopeId, tenant },
      };

      const role: Role = await this.handlers.roles.deleteRole(variables);

      this.ok(res, role);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete role');
    }
  }
}
