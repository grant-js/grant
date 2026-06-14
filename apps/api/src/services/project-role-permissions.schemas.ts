import { z } from 'zod';

import { deleteSchema, idSchema } from './common/schemas';

export const getProjectRolePermissionsParamsSchema = z.object({
  projectId: idSchema.optional(),
  roleId: idSchema.optional(),
  permissionId: idSchema.optional(),
});

export const addProjectRolePermissionInputSchema = z.object({
  projectId: idSchema,
  roleId: idSchema,
  permissionId: idSchema,
});

export const removeProjectRolePermissionInputSchema = deleteSchema.extend({
  projectId: idSchema,
  roleId: idSchema,
  permissionId: idSchema,
});

export const projectRolePermissionSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  roleId: idSchema,
  permissionId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});
