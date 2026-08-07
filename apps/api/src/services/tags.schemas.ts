import { z } from 'zod';

import {
  baseEntitySchema,
  colorSchema,
  deleteSchema,
  idSchema,
  nameSchema,
  nonEmptyNameSchema,
  queryParamsSchema,
  sortOrderSchema,
} from './common/schemas';

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
