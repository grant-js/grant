import { ResourceSlug } from '@grantjs/constants';
import { CreateGroupInput, Group, GroupSortInput, UpdateGroupInput } from '@grantjs/schema';
import { Router } from 'express';

import { requestContext } from '@/rest/request-context';
import { createCrudRouter, CrudListArgs } from '@/rest/routes/common/crud-router';
import {
  createGroupRequestSchema,
  deleteGroupQuerySchema,
  getGroupsQuerySchema,
  groupParamsSchema,
  updateGroupRequestSchema,
} from '@/rest/schemas';
import { RequestContext } from '@/types';

export function createGroupsRouter(fallback?: RequestContext): Router {
  return createCrudRouter({
    resource: ResourceSlug.Group,
    schemas: {
      list: getGroupsQuerySchema,
      create: createGroupRequestSchema,
      update: updateGroupRequestSchema,
      params: groupParamsSchema,
      scopeQuery: deleteGroupQuerySchema,
    },
    list: (args: CrudListArgs<Group, GroupSortInput>, req) =>
      requestContext(req, fallback).handlers.groups.getGroups(args),
    create: (input: CreateGroupInput, req) =>
      requestContext(req, fallback).handlers.groups.createGroup({ input }),
    update: (id, input: UpdateGroupInput, req) =>
      requestContext(req, fallback).handlers.groups.updateGroup({ id, input }),
    remove: (id, scope, req) =>
      requestContext(req, fallback).handlers.groups.deleteGroup({ id, scope }),
  });
}
