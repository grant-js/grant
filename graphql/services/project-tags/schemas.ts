import { z } from 'zod';

import { deleteSchema, idSchema } from '../common/schemas';

export const projectTagSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  tagId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export const getProjectTagsParamsSchema = z.object({
  projectId: idSchema,
});

export const addProjectTagInputSchema = z.object({
  projectId: idSchema,
  tagId: idSchema,
});

export const removeProjectTagInputSchema = deleteSchema.extend({
  projectId: idSchema,
  tagId: idSchema,
});

export const getProjectTagsIntersectionSchema = z.object({
  projectIds: z.array(idSchema),
  tagIds: z.array(idSchema),
});
