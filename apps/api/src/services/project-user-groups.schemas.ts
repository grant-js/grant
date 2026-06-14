import { z } from 'zod';

import { deleteSchema, idSchema } from './common/schemas';

export const getProjectUserGroupsParamsSchema = z.object({
  projectId: idSchema.optional(),
  userId: idSchema.optional(),
  groupId: idSchema.optional(),
});

export const addProjectUserGroupInputSchema = z.object({
  projectId: idSchema,
  userId: idSchema,
  groupId: idSchema,
});

export const removeProjectUserGroupInputSchema = deleteSchema.extend({
  projectId: idSchema,
  userId: idSchema,
  groupId: idSchema,
});

export const projectUserGroupSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  userId: idSchema,
  groupId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});
