import { z } from 'zod';

import { deleteSchema, idSchema } from './common/schemas';

export const queryUserRolesArgsSchema = z
  .object({
    userId: idSchema.optional(),
    roleId: idSchema.optional(),
  })
  .refine((data) => data.userId || data.roleId, {
    message: 'Either userId or roleId must be provided',
  });

export const addUserRoleInputSchema = z.object({
  roleId: idSchema.refine((roleId) => roleId.trim().length > 0, 'Role ID is required'),
  userId: idSchema.refine((userId) => userId.trim().length > 0, 'User ID is required'),
});

export const removeUserRoleInputSchema = deleteSchema.extend({
  roleId: idSchema.refine((roleId) => roleId.trim().length > 0, 'Role ID is required'),
  userId: idSchema.refine((userId) => userId.trim().length > 0, 'User ID is required'),
});

export const addUserRoleArgsSchema = z.object({
  input: addUserRoleInputSchema,
});

export const userRoleSchema = z.object({
  id: idSchema,
  userId: idSchema,
  roleId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
  user: z.any().nullable().optional(),
  role: z.any().nullable().optional(),
});
