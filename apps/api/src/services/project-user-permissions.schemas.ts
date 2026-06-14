import { z } from 'zod';

import { deleteSchema, idSchema } from './common/schemas';

export const getProjectUserPermissionsParamsSchema = z.object({
  projectId: idSchema.optional(),
  userId: idSchema.optional(),
  permissionId: idSchema.optional(),
});

export const addProjectUserPermissionInputSchema = z.object({
  projectId: idSchema,
  userId: idSchema,
  permissionId: idSchema,
});

export const removeProjectUserPermissionInputSchema = deleteSchema.extend({
  projectId: idSchema,
  userId: idSchema,
  permissionId: idSchema,
});

export const projectUserPermissionSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  userId: idSchema,
  permissionId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});
