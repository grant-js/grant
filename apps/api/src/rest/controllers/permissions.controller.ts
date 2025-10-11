import { Response } from 'express';

import {
  CreatePermissionMutationVariables,
  DeletePermissionMutationVariables,
  Permission,
  UpdatePermissionMutationVariables,
} from '@logusgraphics/grant-schema';

import { parseRelations } from '@/lib/field-selection.lib';
import {
  createPermissionRequestSchema,
  deletePermissionQuerySchema,
  getPermissionsQuerySchema,
  permissionParamsSchema,
  updatePermissionRequestSchema,
} from '@/rest/schemas';
import {
  TypedRequest,
  TypedRequestBody,
  TypedRequestParams,
  TypedRequestQuery,
} from '@/rest/types';
import { RequestContext } from '@/types';

import { BaseController } from './base.controller';

export class PermissionsController extends BaseController {
  constructor(context: RequestContext) {
    super(context);
  }

  async getPermissions(
    req: TypedRequest<TypedRequestQuery<typeof getPermissionsQuerySchema>>,
    res: Response
  ): Promise<void> {
    const { page, limit, search, sortField, sortOrder, tagIds, scopeId, tenant, relations } =
      req.query;

    const requestedFields = parseRelations<Permission>(relations);

    try {
      const result = await this.handlers.permissions.getPermissions({
        page,
        limit,
        search: search || undefined,
        sort: sortField && sortOrder ? { field: sortField, order: sortOrder } : undefined,
        tagIds: tagIds || undefined,
        scope: { id: scopeId, tenant },
        requestedFields: requestedFields || (['id', 'name', 'description', 'action'] as any),
      });

      this.ok(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch permissions');
    }
  }

  async createPermission(
    req: TypedRequest<TypedRequestBody<typeof createPermissionRequestSchema>>,
    res: Response
  ): Promise<void> {
    try {
      const variables: CreatePermissionMutationVariables = {
        input: req.body,
      };

      const permission: Permission = await this.handlers.permissions.createPermission(variables);

      this.created(res, permission);
    } catch (error) {
      this.handleError(res, error, 'Failed to create permission');
    }
  }

  async updatePermission(
    req: TypedRequest<
      TypedRequestBody<typeof updatePermissionRequestSchema> &
        TypedRequestParams<typeof permissionParamsSchema>
    >,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    try {
      const variables: UpdatePermissionMutationVariables = {
        id,
        input: req.body,
      };

      const permission: Permission = await this.handlers.permissions.updatePermission(variables);

      this.ok(res, permission);
    } catch (error) {
      this.handleError(res, error, 'Failed to update permission');
    }
  }

  async deletePermission(
    req: TypedRequest<
      TypedRequestParams<typeof permissionParamsSchema> &
        TypedRequestQuery<typeof deletePermissionQuerySchema>
    >,
    res: Response
  ): Promise<void> {
    const { id } = req.params;
    const { scopeId, tenant } = req.query;

    try {
      const variables: DeletePermissionMutationVariables = {
        id,
        scope: { id: scopeId, tenant },
      };

      const permission: Permission = await this.handlers.permissions.deletePermission(variables);

      this.ok(res, permission);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete permission');
    }
  }
}
