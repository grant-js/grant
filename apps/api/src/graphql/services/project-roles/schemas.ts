import { z } from 'zod';

import { deleteSchema, idSchema } from '../common/schemas';

export const projectRoleSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  roleId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export const getProjectRolesParamsSchema = z.object({
  projectId: idSchema,
});

export const addProjectRoleInputSchema = z.object({
  projectId: idSchema,
  roleId: idSchema,
});

export const removeProjectRoleInputSchema = deleteSchema.extend({
  projectId: idSchema,
  roleId: idSchema,
});
