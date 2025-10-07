import { z } from 'zod';

import {
  idSchema,
  nameSchema,
  sortOrderSchema,
  colorSchema,
  baseEntitySchema,
  paginatedResponseSchema,
  sortableParamsSchema,
  nonEmptyNameSchema,
  queryParamsSchema,
  deleteSchema,
} from '../common/schemas';

export const createTagSchema = z.object({
  name: nonEmptyNameSchema,
  color: colorSchema,
});

export const updateTagSchema = z.object({
  name: nonEmptyNameSchema.optional(),
  color: colorSchema,
});

export const tagQuerySchema = sortableParamsSchema.extend({
  ids: z.array(idSchema).optional(),
  sort: z
    .object({
      field: z.enum(['name', 'createdAt', 'updatedAt']),
      order: sortOrderSchema,
    })
    .optional(),
});

export const tagSortableFieldSchema = z.enum(['name', 'color', 'createdAt', 'updatedAt']);
export const tagSortInputSchema = z.object({
  field: tagSortableFieldSchema,
  order: sortOrderSchema,
});

export const createTagInputSchema = z.object({
  name: nonEmptyNameSchema,
  color: colorSchema,
});

export const updateTagInputSchema = z.object({
  name: nonEmptyNameSchema.nullable().optional(),
  color: colorSchema.nullable().optional(),
});

export const updateTagArgsSchema = z.object({
  id: idSchema,
  input: updateTagInputSchema,
});

export const deleteTagArgsSchema = deleteSchema.extend({
  id: idSchema,
});

export const queryTagsArgsSchema = queryParamsSchema.extend({
  sort: tagSortInputSchema.nullable().optional(),
});

export const tagSchema = baseEntitySchema.extend({
  name: nameSchema,
  color: colorSchema,
});

export const tagPageSchema = paginatedResponseSchema(tagSchema).transform((data) => ({
  tags: data.items,
  hasNextPage: data.hasNextPage,
  totalCount: data.totalCount,
}));
