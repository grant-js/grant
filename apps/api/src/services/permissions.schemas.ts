import { permissionConditionSchema } from '@grantjs/core';
import { z } from 'zod';

import {
  actionSchema,
  baseEntitySchema,
  deleteSchema,
  descriptionSchema,
  idSchema,
  nameSchema,
  nonEmptyActionSchema,
  nonEmptyNameSchema,
  paginatedResponseSchema,
  queryParamsSchema,
  sortOrderSchema,
} from './common/schemas';
import { resourceSchema } from './resources.schemas';
import { tagSchema } from './tags.schemas';

export const permissionSortableFieldSchema = z.enum([
  'name',
  'description',
  'action',
  'createdAt',
  'updatedAt',
]);
export const permissionSortInputSchema = z.object({
  field: permissionSortableFieldSchema,
  order: sortOrderSchema,
});

export const getPermissionsParamsSchema = queryParamsSchema.extend({
  sort: permissionSortInputSchema.nullable().optional(),
});

// permissionConditionSchema is imported from @grantjs/core

export const createPermissionParamsSchema = z.object({
  name: nonEmptyNameSchema,
  description: descriptionSchema,
  action: nonEmptyActionSchema,
  resourceId: idSchema.nullable().optional(),
  condition: permissionConditionSchema.nullable().optional(),
});

export const updatePermissionParamsSchema = z.object({
  id: idSchema,
  input: z.object({
    name: nonEmptyNameSchema.nullable().optional(),
    description: descriptionSchema,
    action: nonEmptyActionSchema.nullable().optional(),
    resourceId: idSchema.nullable().optional(),
    condition: permissionConditionSchema.nullable().optional(),
  }),
});

export const deletePermissionParamsSchema = deleteSchema.extend({
  id: idSchema,
});

export const permissionSchema = baseEntitySchema.extend({
  name: nameSchema,
  description: descriptionSchema.nullable(),
  action: actionSchema,
  resourceId: idSchema.nullable(),
  resource: resourceSchema.optional(),
  condition: permissionConditionSchema.nullable().optional(),
  tags: z.array(tagSchema).optional(),
});

export const permissionPageSchema = paginatedResponseSchema(permissionSchema).transform((data) => ({
  permissions: data.items,
  totalCount: data.totalCount,
  hasNextPage: data.hasNextPage,
}));
