import { z } from 'zod';

import {
  baseEntitySchema,
  colorSchema,
  deleteSchema,
  idSchema,
  nameSchema,
  nonEmptyNameSchema,
  paginatedResponseSchema,
  queryParamsSchema,
  sortableParamsSchema,
  sortOrderSchema,
} from './common/schemas';

export const createTagSchema = z.object({
  name: nonEmptyNameSchema,
  color: colorSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateTagSchema = z.object({
  name: nonEmptyNameSchema.optional(),
  color: colorSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
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

const tagSortableFieldSchema = z.enum(['name', 'color', 'createdAt', 'updatedAt']);
const tagSortInputSchema = z.object({
  field: tagSortableFieldSchema,
  order: sortOrderSchema,
});

export const createTagInputSchema = z.object({
  name: nonEmptyNameSchema,
  color: colorSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateTagInputSchema = z.object({
  name: nonEmptyNameSchema.nullable().optional(),
  color: colorSchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
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
  metadata: z.record(z.string(), z.unknown()),
});

export const tagPageSchema = paginatedResponseSchema(tagSchema).transform((data) => ({
  tags: data.items,
  hasNextPage: data.hasNextPage,
  totalCount: data.totalCount,
}));
