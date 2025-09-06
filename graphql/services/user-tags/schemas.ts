import { z } from 'zod';

import { deleteSchema, idSchema } from '../common/schemas';

export const queryUserTagsArgsSchema = z.object({
  userId: idSchema,
});

export const addUserTagInputSchema = z.object({
  tagId: idSchema.refine((tagId) => tagId.trim().length > 0, 'Tag ID is required'),
  userId: idSchema.refine((userId) => userId.trim().length > 0, 'User ID is required'),
  isPrimary: z.boolean().nullable().optional(),
});

export const updateUserTagInputSchema = z.object({
  tagId: idSchema.refine((tagId) => tagId.trim().length > 0, 'Tag ID is required'),
  userId: idSchema.refine((userId) => userId.trim().length > 0, 'User ID is required'),
  isPrimary: z.boolean(),
});

export const removeUserTagInputSchema = deleteSchema.extend({
  tagId: idSchema.refine((tagId) => tagId.trim().length > 0, 'Tag ID is required'),
  userId: idSchema.refine((userId) => userId.trim().length > 0, 'User ID is required'),
});

export const removeUsersTagsInputSchema = deleteSchema.extend({
  tagId: idSchema.refine((tagId) => tagId.trim().length > 0, 'Tag ID is required'),
});

export const addUserTagArgsSchema = z.object({
  input: addUserTagInputSchema,
});

export const removeUserTagArgsSchema = z.object({
  input: removeUserTagInputSchema,
});

export const getUserTagIntersectionInputSchema = z.object({
  userIds: idSchema.array().refine((userIds) => userIds.length > 0, 'User IDs are required'),
  tagIds: idSchema.array().refine((tagIds) => tagIds.length > 0, 'Tag IDs are required'),
});

export const userTagSchema = z.object({
  id: idSchema,
  userId: idSchema,
  tagId: idSchema,
  isPrimary: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
  user: z.any().nullable().optional(),
  tag: z.any().nullable().optional(),
});
