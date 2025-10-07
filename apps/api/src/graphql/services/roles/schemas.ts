import { RoleSortableField } from '@logusgraphics/grant-schema';
import { z } from 'zod';

import {
  idSchema,
  nameSchema,
  descriptionSchema,
  sortOrderSchema,
  baseEntitySchema,
  paginatedResponseSchema,
  nonEmptyNameSchema,
  queryParamsSchema,
  deleteSchema,
} from '../common/schemas';

export const roleSortableFieldSchema = z.enum(
  Object.values(RoleSortableField) as [RoleSortableField, ...RoleSortableField[]]
);
export const roleSortInputSchema = z.object({
  field: roleSortableFieldSchema,
  order: sortOrderSchema,
});

export const createRoleInputSchema = z.object({
  name: nonEmptyNameSchema,
  description: descriptionSchema,
});

export const updateRoleInputSchema = z.object({
  name: nonEmptyNameSchema.nullable().optional(),
  description: descriptionSchema.nullable().optional(),
});

export const createRoleArgsSchema = z.object({
  input: createRoleInputSchema,
});

export const updateRoleArgsSchema = z.object({
  id: idSchema,
  input: updateRoleInputSchema,
});

export const deleteRoleArgsSchema = deleteSchema.extend({
  id: idSchema,
});

export const roleSchema = baseEntitySchema.extend({
  name: nameSchema,
  description: descriptionSchema,
  groups: z.array(z.any()).nullable().optional(),
  tags: z.array(z.any()).nullable().optional(),
});

export const rolePageSchema = paginatedResponseSchema(roleSchema).transform((data) => ({
  roles: data.items,
  hasNextPage: data.hasNextPage,
  totalCount: data.totalCount,
}));

export const getRolesParamsSchema = queryParamsSchema.extend({
  sort: roleSortInputSchema.nullable().optional(),
});
