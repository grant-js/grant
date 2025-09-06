import { z } from 'zod';

import { deleteSchema, idSchema } from '../common/schemas';

export const queryGroupTagsArgsSchema = z.object({
  groupId: idSchema,
});

export const addGroupTagInputSchema = z.object({
  groupId: idSchema.refine((groupId) => groupId.trim().length > 0, 'Group ID is required'),
  tagId: idSchema.refine((tagId) => tagId.trim().length > 0, 'Tag ID is required'),
  isPrimary: z.boolean().nullable().optional(),
});

export const updateGroupTagInputSchema = z.object({
  groupId: idSchema.refine((groupId) => groupId.trim().length > 0, 'Group ID is required'),
  tagId: idSchema.refine((tagId) => tagId.trim().length > 0, 'Tag ID is required'),
  isPrimary: z.boolean(),
});

export const removeGroupTagInputSchema = deleteSchema.extend({
  groupId: idSchema.refine((groupId) => groupId.trim().length > 0, 'Group ID is required'),
  tagId: idSchema.refine((tagId) => tagId.trim().length > 0, 'Tag ID is required'),
});

export const getGroupTagIntersectionInputSchema = z.object({
  groupIds: z.array(idSchema).refine((groupIds) => groupIds.length > 0, 'Group IDs are required'),
  tagIds: z.array(idSchema).refine((tagIds) => tagIds.length > 0, 'Tag IDs are required'),
});

export const removeGroupTagsInputSchema = deleteSchema.extend({
  tagId: idSchema,
});

export const addGroupTagArgsSchema = z.object({
  input: addGroupTagInputSchema,
});

export const removeGroupTagArgsSchema = z.object({
  input: removeGroupTagInputSchema,
});

export const groupTagSchema = z.object({
  id: idSchema,
  groupId: idSchema,
  tagId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
  group: z.any().nullable().optional(),
  tag: z.any().nullable().optional(),
});
