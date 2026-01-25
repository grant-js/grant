import { z } from 'zod';

import { deleteSchema, idSchema } from './common/schemas';

export const projectResourceSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  resourceId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export const getProjectResourcesParamsSchema = z.object({
  projectId: idSchema,
});

export const addProjectResourceInputSchema = z.object({
  projectId: idSchema,
  resourceId: idSchema,
});

export const addProjectResourceParamsSchema = z.object({
  input: addProjectResourceInputSchema,
});

export const removeProjectResourceInputSchema = deleteSchema.extend({
  projectId: idSchema,
  resourceId: idSchema,
});
