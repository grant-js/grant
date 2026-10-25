import { ResourceSlug } from '@grantjs/constants';
import { CreateRoleInput, Role, RoleSortInput, UpdateRoleInput } from '@grantjs/schema';
import { Router } from 'express';

import { requestContext } from '@/rest/request-context';
import { createCrudRouter, CrudListArgs } from '@/rest/routes/common/crud-router';
import {
  createRoleRequestSchema,
  deleteRoleQuerySchema,
  getRolesQuerySchema,
  roleParamsSchema,
  updateRoleRequestSchema,
} from '@/rest/schemas';
import { RequestContext } from '@/types';

export function createRolesRouter(fallback?: RequestContext): Router {
  return createCrudRouter({
    resource: ResourceSlug.Role,
    schemas: {
      list: getRolesQuerySchema,
      create: createRoleRequestSchema,
      update: updateRoleRequestSchema,
      params: roleParamsSchema,
      scopeQuery: deleteRoleQuerySchema,
    },
    list: (args: CrudListArgs<Role, RoleSortInput>, req) =>
      requestContext(req, fallback).handlers.roles.getRoles(args),
    create: (input: CreateRoleInput, req) =>
      requestContext(req, fallback).handlers.roles.createRole({ input }),
    update: (id, input: UpdateRoleInput, req) =>
      requestContext(req, fallback).handlers.roles.updateRole({ id, input }),
    remove: (id, scope, req) =>
      requestContext(req, fallback).handlers.roles.deleteRole({ id, scope }),
  });
}
