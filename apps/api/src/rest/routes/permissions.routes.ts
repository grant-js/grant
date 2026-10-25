import { ResourceSlug } from '@grantjs/constants';
import {
  CreatePermissionInput,
  Permission,
  PermissionSortInput,
  UpdatePermissionInput,
} from '@grantjs/schema';
import { Router } from 'express';

import { requestContext } from '@/rest/request-context';
import { createCrudRouter, CrudListArgs } from '@/rest/routes/common/crud-router';
import {
  createPermissionRequestSchema,
  deletePermissionQuerySchema,
  getPermissionsQuerySchema,
  permissionParamsSchema,
  updatePermissionRequestSchema,
} from '@/rest/schemas';
import { RequestContext } from '@/types';

export function createPermissionsRouter(fallback?: RequestContext): Router {
  return createCrudRouter({
    resource: ResourceSlug.Permission,
    schemas: {
      list: getPermissionsQuerySchema,
      create: createPermissionRequestSchema,
      update: updatePermissionRequestSchema,
      params: permissionParamsSchema,
      scopeQuery: deletePermissionQuerySchema,
    },
    list: (args: CrudListArgs<Permission, PermissionSortInput>, req) =>
      requestContext(req, fallback).handlers.permissions.getPermissions(args),
    create: (input: CreatePermissionInput, req) =>
      requestContext(req, fallback).handlers.permissions.createPermission({ input }),
    update: (id, input: UpdatePermissionInput, req) =>
      requestContext(req, fallback).handlers.permissions.updatePermission({ id, input }),
    remove: (id, scope, req) =>
      requestContext(req, fallback).handlers.permissions.deletePermission({ id, scope }),
  });
}
