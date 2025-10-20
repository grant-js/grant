import {
  CreatePermissionMutationVariables,
  DeletePermissionMutationVariables,
  Permission,
  UpdatePermissionMutationVariables,
} from '@logusgraphics/grant-schema';
import { Response } from 'express';

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

    const result = await this.handlers.permissions.getPermissions({
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

  async createPermission(
    req: TypedRequest<TypedRequestBody<typeof createPermissionRequestSchema>>,
    res: Response
  ): Promise<void> {
    const variables: CreatePermissionMutationVariables = {
      input: req.body,
    };

    const permission: Permission = await this.handlers.permissions.createPermission(variables);

    this.success(res, permission, 201);
  }

  async updatePermission(
    req: TypedRequest<
      TypedRequestBody<typeof updatePermissionRequestSchema> &
        TypedRequestParams<typeof permissionParamsSchema>
    >,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const variables: UpdatePermissionMutationVariables = {
      id,
      input: req.body,
    };

    const permission: Permission = await this.handlers.permissions.updatePermission(variables);

    this.success(res, permission);
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

    const variables: DeletePermissionMutationVariables = {
      id,
      scope: { id: scopeId, tenant },
    };

    const permission: Permission = await this.handlers.permissions.deletePermission(variables);

    this.success(res, permission);
  }
}
