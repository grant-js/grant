import { z } from 'zod';

import { deleteSchema, idSchema, scopeSchema } from './common/schemas';

export const queryUserPermissionsArgsSchema = z
  .object({
    userId: idSchema.optional(),
    permissionId: idSchema.optional(),
  })
  .refine((data) => data.userId || data.permissionId, {
    message: 'errors.validation.eitherUserIdOrPermissionIdRequired',
  });

export const assignUserPermissionInputSchema = z.object({
  userId: idSchema.refine((userId) => userId.trim().length > 0, 'errors.validation.userIdRequired'),
  permissionId: idSchema.refine(
    (permissionId) => permissionId.trim().length > 0,
    'errors.validation.permissionIdRequired'
  ),
  scope: scopeSchema,
});

export const revokeUserPermissionInputSchema = deleteSchema.extend({
  userId: idSchema.refine((userId) => userId.trim().length > 0, 'errors.validation.userIdRequired'),
  permissionId: idSchema.refine(
    (permissionId) => permissionId.trim().length > 0,
    'errors.validation.permissionIdRequired'
  ),
  scope: scopeSchema,
});

export const userPermissionSchema = z.object({
  id: idSchema,
  userId: idSchema,
  permissionId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
  user: z.any().nullable().optional(),
  permission: z.any().nullable().optional(),
});
