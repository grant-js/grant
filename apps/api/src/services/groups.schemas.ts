import { z } from 'zod';

import {
  baseEntitySchema,
  deleteSchema,
  descriptionSchema,
  idSchema,
  metadataSchema,
  nameSchema,
  nonEmptyNameSchema,
  sortableParamsSchema,
  sortOrderSchema,
} from './common/schemas';

const groupSortableFieldSchema = z.enum(['name', 'description', 'createdAt', 'updatedAt']);
const groupSortInputSchema = z.object({
  field: groupSortableFieldSchema,
  order: sortOrderSchema,
});

export const getGroupsParamsSchema = sortableParamsSchema.extend({
  sort: groupSortInputSchema.nullable().optional(),
});

export const createGroupParamsSchema = z.object({
  name: nonEmptyNameSchema,
  description: descriptionSchema,
  metadata: metadataSchema.nullable().optional(),
});

export const updateGroupParamsSchema = z.object({
  id: idSchema,
  input: z.object({
    name: nonEmptyNameSchema.nullable().optional(),
    description: descriptionSchema.nullable().optional(),
    metadata: metadataSchema.nullable().optional(),
  }),
});

export const deleteGroupParamsSchema = deleteSchema.extend({
  id: idSchema,
});

export const groupSchema = baseEntitySchema.extend({
  name: nameSchema,
  description: descriptionSchema.nullable(),
  metadata: metadataSchema,
});
