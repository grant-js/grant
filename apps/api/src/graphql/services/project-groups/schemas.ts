import { z } from 'zod';

import { deleteSchema, idSchema } from '../common/schemas';

export const projectGroupSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  groupId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export const getProjectGroupsParamsSchema = z.object({
  projectId: idSchema,
});

export const addProjectGroupInputSchema = z.object({
  projectId: idSchema,
  groupId: idSchema,
});

export const removeProjectGroupInputSchema = deleteSchema.extend({
  projectId: idSchema,
  groupId: idSchema,
});
