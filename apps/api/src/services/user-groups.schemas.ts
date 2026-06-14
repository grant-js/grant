import { z } from 'zod';

import { deleteSchema, idSchema } from './common/schemas';

export const queryUserGroupsArgsSchema = z
  .object({
    userId: idSchema.optional(),
    groupId: idSchema.optional(),
  })
  .refine((data) => data.userId || data.groupId, {
    message: 'errors.validation.eitherUserIdOrGroupIdRequired',
  });

export const addUserGroupInputSchema = z.object({
  groupId: idSchema.refine(
    (groupId) => groupId.trim().length > 0,
    'errors.validation.groupIdRequired'
  ),
  userId: idSchema.refine((userId) => userId.trim().length > 0, 'errors.validation.userIdRequired'),
});

export const removeUserGroupInputSchema = deleteSchema.extend({
  groupId: idSchema.refine(
    (groupId) => groupId.trim().length > 0,
    'errors.validation.groupIdRequired'
  ),
  userId: idSchema.refine((userId) => userId.trim().length > 0, 'errors.validation.userIdRequired'),
});

export const userGroupSchema = z.object({
  id: idSchema,
  userId: idSchema,
  groupId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
  user: z.any().nullable().optional(),
  group: z.any().nullable().optional(),
});
