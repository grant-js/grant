import { z } from 'zod';

import { deleteSchema, idSchema } from './common/schemas';

export const accountTagSchema = z.object({
  id: idSchema,
  accountId: idSchema,
  tagId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export const getAccountTagsParamsSchema = z.object({
  accountId: idSchema,
});

export const addAccountTagInputSchema = z.object({
  accountId: idSchema,
  tagId: idSchema,
});

export const removeAccountTagInputSchema = deleteSchema.extend({
  accountId: idSchema,
  tagId: idSchema,
});
