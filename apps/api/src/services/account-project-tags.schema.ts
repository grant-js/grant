import { z } from 'zod';

import { deleteSchema, idSchema } from './common/schemas';

export const accountProjectTagSchema = z.object({
  id: idSchema,
  accountId: idSchema,
  projectId: idSchema,
  tagId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export const getAccountProjectTagsParamsSchema = z.object({
  accountId: idSchema,
  projectId: idSchema,
});

export const getAccountProjectTagsIntersectionSchema = z.object({
  accountId: idSchema,
  projectIds: z.array(idSchema),
  tagIds: z.array(idSchema),
});

export const addAccountProjectTagInputSchema = z.object({
  accountId: idSchema,
  projectId: idSchema,
  tagId: idSchema,
  isPrimary: z.boolean().nullable().optional(),
});

export const removeAccountProjectTagInputSchema = deleteSchema.extend({
  accountId: idSchema,
  projectId: idSchema,
  tagId: idSchema,
});

export const updateAccountProjectTagInputSchema = z.object({
  accountId: idSchema,
  projectId: idSchema,
  tagId: idSchema,
  isPrimary: z.boolean(),
});
