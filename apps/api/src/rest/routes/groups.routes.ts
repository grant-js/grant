import { ResourceSlug } from '@grantjs/constants';
import { CreateGroupInput, Group, GroupSortInput, UpdateGroupInput } from '@grantjs/schema';
import { Router } from 'express';

import { createCrudRouter, CrudListArgs } from '@/rest/routes/common/crud-router';
import {
  createGroupRequestSchema,
  deleteGroupQuerySchema,
  getGroupsQuerySchema,
  groupParamsSchema,
  updateGroupRequestSchema,
} from '@/rest/schemas';
import { RequestContext } from '@/types';

export function createGroupsRouter(context: RequestContext): Router {
  return createCrudRouter({
    resource: ResourceSlug.Group,
    schemas: {
      list: getGroupsQuerySchema,
      create: createGroupRequestSchema,
      update: updateGroupRequestSchema,
      params: groupParamsSchema,
      scopeQuery: deleteGroupQuerySchema,
    },
    list: (args: CrudListArgs<Group, GroupSortInput>) => context.handlers.groups.getGroups(args),
    create: (input: CreateGroupInput) => context.handlers.groups.createGroup({ input }),
    update: (id, input: UpdateGroupInput) => context.handlers.groups.updateGroup({ id, input }),
    remove: (id, scope) => context.handlers.groups.deleteGroup({ id, scope }),
  });
}
