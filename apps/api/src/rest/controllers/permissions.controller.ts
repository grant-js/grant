import { Response } from 'express';

import {
  CreatePermissionMutationVariables,
  DeletePermissionMutationVariables,
  Permission,
  PermissionWithRelations,
  QueryPermissionsArgs,
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
  RequestContext,
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

    const requestedFields = parseRelations<PermissionWithRelations>(relations);

    try {
      const args: QueryPermissionsArgs = {
        pagination: { page, limit },
        search: search || undefined,
        sortBy: sortField || undefined,
        sortOrder: sortOrder || undefined,
        tagIds: tagIds || undefined,
        scope: { id: scopeId, tenant },
      };

      const result = await req.context.handlers.permissions.getPermissions(
        args,
        requestedFields || (['id', 'name', 'description', 'action'] as any)
      );

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

      const permission: Permission = await req.context.handlers.permissions.createPermission(
        variables,
        ['id', 'name', 'description', 'action'] as any
      );

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

      const permission: Permission = await req.context.handlers.permissions.updatePermission(
        variables,
        ['id', 'name', 'description', 'action'] as any
      );

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
    const { scopeId, tenant, hardDelete } = req.query;

    try {
      const variables: DeletePermissionMutationVariables = {
        id,
        scope: { id: scopeId, tenant },
        hardDelete: hardDelete || false,
      };

      const permission: Permission = await req.context.handlers.permissions.deletePermission(
        variables,
        ['id', 'name', 'action'] as any
      );

      this.ok(res, permission);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete permission');
    }
  }
}
