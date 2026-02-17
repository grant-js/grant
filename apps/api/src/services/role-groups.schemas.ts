import { z } from 'zod';

import { deleteSchema, idSchema } from './common/schemas';

export const queryRoleGroupsArgsSchema = z
  .object({
    roleId: idSchema.optional(),
    groupId: idSchema.optional(),
  })
  .refine((data) => data.roleId || data.groupId, {
    message: 'errors.validation.eitherRoleIdOrGroupIdRequired',
  });

export const addRoleGroupInputSchema = z.object({
  roleId: idSchema.refine((roleId) => roleId.trim().length > 0, 'errors.validation.roleIdRequired'),
  groupId: idSchema.refine(
    (groupId) => groupId.trim().length > 0,
    'errors.validation.groupIdRequired'
  ),
});

export const removeRoleGroupInputSchema = deleteSchema.extend({
  roleId: idSchema.refine((roleId) => roleId.trim().length > 0, 'errors.validation.roleIdRequired'),
  groupId: idSchema.refine(
    (groupId) => groupId.trim().length > 0,
    'errors.validation.groupIdRequired'
  ),
});

export const addRoleGroupArgsSchema = z.object({
  input: addRoleGroupInputSchema,
});

export const removeRoleGroupArgsSchema = z.object({
  input: removeRoleGroupInputSchema,
});

export const roleGroupSchema = z.object({
  id: idSchema,
  roleId: idSchema,
  groupId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
  role: z.any().nullable().optional(),
  group: z.any().nullable().optional(),
});
