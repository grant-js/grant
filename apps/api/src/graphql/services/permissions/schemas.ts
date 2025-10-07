import { z } from 'zod';

import {
  idSchema,
  nameSchema,
  descriptionSchema,
  sortOrderSchema,
  actionSchema,
  baseEntitySchema,
  paginatedResponseSchema,
  nonEmptyNameSchema,
  nonEmptyActionSchema,
  queryParamsSchema,
  deleteSchema,
} from '../common/schemas';

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

export const createPermissionParamsSchema = z.object({
  name: nonEmptyNameSchema,
  description: descriptionSchema,
  action: nonEmptyActionSchema,
});

export const updatePermissionParamsSchema = z.object({
  id: idSchema,
  input: z.object({
    name: nonEmptyNameSchema.nullable().optional(),
    description: descriptionSchema,
    action: nonEmptyActionSchema.nullable().optional(),
  }),
});

export const deletePermissionParamsSchema = deleteSchema.extend({
  id: idSchema,
});

export const permissionSchema = baseEntitySchema.extend({
  name: nameSchema,
  description: descriptionSchema.nullable(),
  action: actionSchema,
});

export const permissionPageSchema = paginatedResponseSchema(permissionSchema).transform((data) => ({
  permissions: data.items,
  totalCount: data.totalCount,
  hasNextPage: data.hasNextPage,
}));
