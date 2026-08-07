import { ResourceSlug } from '@grantjs/constants';
import {
  CreatePermissionInput,
  Permission,
  PermissionSortInput,
  UpdatePermissionInput,
} from '@grantjs/schema';
import { Router } from 'express';

import { createCrudRouter, CrudListArgs } from '@/rest/routes/common/crud-router';
import {
  createPermissionRequestSchema,
  deletePermissionQuerySchema,
  getPermissionsQuerySchema,
  permissionParamsSchema,
  updatePermissionRequestSchema,
} from '@/rest/schemas';
import { RequestContext } from '@/types';

export function createPermissionsRouter(context: RequestContext): Router {
  return createCrudRouter({
    resource: ResourceSlug.Permission,
    schemas: {
      list: getPermissionsQuerySchema,
      create: createPermissionRequestSchema,
      update: updatePermissionRequestSchema,
      params: permissionParamsSchema,
      scopeQuery: deletePermissionQuerySchema,
    },
    list: (args: CrudListArgs<Permission, PermissionSortInput>) =>
      context.handlers.permissions.getPermissions(args),
    create: (input: CreatePermissionInput) =>
      context.handlers.permissions.createPermission({ input }),
    update: (id, input: UpdatePermissionInput) =>
      context.handlers.permissions.updatePermission({ id, input }),
    remove: (id, scope) => context.handlers.permissions.deletePermission({ id, scope }),
  });
}
