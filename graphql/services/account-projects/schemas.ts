import { z } from 'zod';

import { deleteSchema, idSchema } from '../common/schemas';

export const queryAccountProjectsArgsSchema = z.object({
  accountId: idSchema,
});

export const queryAccountProjectArgsSchema = z.object({
  projectId: idSchema,
});

export const addAccountProjectInputSchema = z.object({
  accountId: idSchema.refine((accountId) => accountId.trim().length > 0, 'Account ID is required'),
  projectId: idSchema.refine((projectId) => projectId.trim().length > 0, 'Project ID is required'),
});

export const removeAccountProjectInputSchema = deleteSchema.extend({
  accountId: idSchema.refine((accountId) => accountId.trim().length > 0, 'Account ID is required'),
  projectId: idSchema.refine((projectId) => projectId.trim().length > 0, 'Project ID is required'),
});

export const addAccountProjectArgsSchema = addAccountProjectInputSchema;

export const removeAccountProjectArgsSchema = z.object({
  input: removeAccountProjectInputSchema,
});

export const accountProjectSchema = z.object({
  id: idSchema,
  accountId: idSchema,
  projectId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
  account: z.any().nullable().optional(),
  project: z.any().nullable().optional(),
});
