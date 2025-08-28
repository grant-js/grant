import { z } from 'zod';

import {
  idSchema,
  nameSchema,
  descriptionSchema,
  baseEntitySchema,
  paginatedResponseSchema,
  sortableParamsSchema,
  nonEmptyNameSchema,
  sortOrderSchema,
} from '../common/schemas';

export const groupSortableFieldSchema = z.enum(['name', 'description', 'createdAt', 'updatedAt']);
export const groupSortInputSchema = z.object({
  field: groupSortableFieldSchema,
  order: sortOrderSchema,
});

export const getGroupsParamsSchema = sortableParamsSchema.extend({
  sort: groupSortInputSchema.optional(),
});

export const createGroupParamsSchema = z.object({
  input: z.object({
    name: nonEmptyNameSchema,
    description: descriptionSchema,
  }),
});

export const updateGroupParamsSchema = z.object({
  id: idSchema,
  input: z.object({
    name: nonEmptyNameSchema.optional(),
    description: descriptionSchema,
  }),
});

export const deleteGroupParamsSchema = z.object({
  id: idSchema,
});

export const groupSchema = baseEntitySchema.extend({
  name: nameSchema,
  description: descriptionSchema.nullable(),
});

export const groupPageSchema = paginatedResponseSchema(groupSchema).transform((data) => ({
  groups: data.items,
  totalCount: data.totalCount,
  hasNextPage: data.hasNextPage,
}));
