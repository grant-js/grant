import { z } from 'zod';

import { idSchema, deleteSchema } from './common/schemas';

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

export const addAccountTagParamsSchema = z.object({
  input: addAccountTagInputSchema,
});

export const removeAccountTagInputSchema = deleteSchema.extend({
  accountId: idSchema,
  tagId: idSchema,
});

export const removeAccountTagParamsSchema = z.object({
  input: removeAccountTagInputSchema,
});
