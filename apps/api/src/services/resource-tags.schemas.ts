import { z } from 'zod';

import { deleteSchema, idSchema } from './common/schemas';

export const resourceTagSchema = z.object({
  id: idSchema,
  resourceId: idSchema,
  tagId: idSchema,
  isPrimary: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export const getResourceTagsParamsSchema = z.object({
  resourceId: idSchema,
});

export const addResourceTagInputSchema = z.object({
  resourceId: idSchema,
  tagId: idSchema,
  isPrimary: z.boolean().nullable().optional(),
});

export const updateResourceTagInputSchema = z.object({
  resourceId: idSchema,
  tagId: idSchema,
  isPrimary: z.boolean(),
});

export const addResourceTagParamsSchema = z.object({
  input: addResourceTagInputSchema,
});

export const removeResourceTagInputSchema = deleteSchema.extend({
  resourceId: idSchema,
  tagId: idSchema,
});

export const removeResourceTagsInputSchema = deleteSchema.extend({
  tagId: idSchema,
});

export const getResourceTagIntersectionInputSchema = z.object({
  resourceIds: z.array(idSchema),
  tagIds: z.array(idSchema),
});
