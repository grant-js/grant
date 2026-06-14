import { z } from 'zod';

import { deleteSchema, idSchema, scopeSchema } from './common/schemas';

export const queryRolePermissionsArgsSchema = z
  .object({
    roleId: idSchema.optional(),
    permissionId: idSchema.optional(),
  })
  .refine((data) => data.roleId || data.permissionId, {
    message: 'errors.validation.eitherRoleIdOrPermissionIdRequired',
  });

export const assignRolePermissionInputSchema = z.object({
  roleId: idSchema.refine((roleId) => roleId.trim().length > 0, 'errors.validation.roleIdRequired'),
  permissionId: idSchema.refine(
    (permissionId) => permissionId.trim().length > 0,
    'errors.validation.permissionIdRequired'
  ),
  scope: scopeSchema,
});

export const revokeRolePermissionInputSchema = deleteSchema.extend({
  roleId: idSchema.refine((roleId) => roleId.trim().length > 0, 'errors.validation.roleIdRequired'),
  permissionId: idSchema.refine(
    (permissionId) => permissionId.trim().length > 0,
    'errors.validation.permissionIdRequired'
  ),
  scope: scopeSchema,
});

export const rolePermissionSchema = z.object({
  id: idSchema,
  roleId: idSchema,
  permissionId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
  role: z.any().nullable().optional(),
  permission: z.any().nullable().optional(),
});
