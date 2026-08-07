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
  nonEmptyStringMessage,
  nonEmptyStringRefinement,
  paginatedResponseSchema,
  queryParamsSchema,
  sortOrderSchema,
} from './common/schemas';
import { resourceSchema } from './resources.schemas';
import { tagSchema } from './tags.schemas';

const permissionSortableFieldSchema = z.enum([
  'name',
  'description',
  'action',
  'createdAt',
  'updatedAt',
]);
const permissionSortInputSchema = z.object({
  field: permissionSortableFieldSchema,
  order: sortOrderSchema,
});

export const getPermissionsParamsSchema = queryParamsSchema.extend({
  sort: permissionSortInputSchema.nullable().optional(),
});

// permissionConditionSchema is imported from @grantjs/core

/** Aligned with DB `permissions.name` (varchar 255). */
const permissionCreateNameSchema = z
  .string()
  .min(1, 'errors.validation.nameRequired')
  .max(255, 'errors.validation.nameTooLong')
  .refine(nonEmptyStringRefinement, nonEmptyStringMessage);

/** Aligned with DB `permissions.description` (varchar 1000). */
const permissionCreateDescriptionSchema = z
  .string()
  .max(1000, 'errors.validation.descriptionTooLong')
  .nullable()
  .optional();

export const createPermissionParamsSchema = z.object({
  name: permissionCreateNameSchema,
  description: permissionCreateDescriptionSchema,
  action: nonEmptyActionSchema,
  resourceId: idSchema.nullable().optional(),
  condition: permissionConditionSchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
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
  resource: resourceSchema.nullable().optional(),
  condition: permissionConditionSchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()),
  tags: z.array(tagSchema).optional(),
});

export const permissionPageSchema = paginatedResponseSchema(permissionSchema).transform((data) => ({
  permissions: data.items,
  totalCount: data.totalCount,
  hasNextPage: data.hasNextPage,
}));
