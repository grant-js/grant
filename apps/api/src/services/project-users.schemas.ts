import { z } from 'zod';

import { deleteSchema, idSchema } from './common/schemas';

export const getProjectUsersParamsSchema = z.object({
  projectId: idSchema.optional(),
  userId: idSchema.optional(),
});

export const addProjectUserParamsSchema = z.object({
  projectId: idSchema,
  userId: idSchema,
});

export const removeProjectUserParamsSchema = deleteSchema.extend({
  projectId: idSchema,
  userId: idSchema,
});

export const projectUserSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  userId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});
