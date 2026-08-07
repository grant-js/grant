import { ResourceSlug } from '@grantjs/constants';
import { CreateRoleInput, Role, RoleSortInput, UpdateRoleInput } from '@grantjs/schema';
import { Router } from 'express';

import { createCrudRouter, CrudListArgs } from '@/rest/routes/common/crud-router';
import {
  createRoleRequestSchema,
  deleteRoleQuerySchema,
  getRolesQuerySchema,
  roleParamsSchema,
  updateRoleRequestSchema,
} from '@/rest/schemas';
import { RequestContext } from '@/types';

export function createRolesRouter(context: RequestContext): Router {
  return createCrudRouter({
    resource: ResourceSlug.Role,
    schemas: {
      list: getRolesQuerySchema,
      create: createRoleRequestSchema,
      update: updateRoleRequestSchema,
      params: roleParamsSchema,
      scopeQuery: deleteRoleQuerySchema,
    },
    list: (args: CrudListArgs<Role, RoleSortInput>) => context.handlers.roles.getRoles(args),
    create: (input: CreateRoleInput) => context.handlers.roles.createRole({ input }),
    update: (id, input: UpdateRoleInput) => context.handlers.roles.updateRole({ id, input }),
    remove: (id, scope) => context.handlers.roles.deleteRole({ id, scope }),
  });
}
