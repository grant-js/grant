import { z } from 'zod';

import { deleteSchema, idSchema } from '../common/schemas';

export const organizationRoleSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  roleId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export const getOrganizationRolesParamsSchema = z.object({
  organizationId: idSchema,
});

export const addOrganizationRoleInputSchema = z.object({
  organizationId: idSchema,
  roleId: idSchema,
});

export const addOrganizationRoleParamsSchema = z.object({
  input: addOrganizationRoleInputSchema,
});

export const removeOrganizationRoleInputSchema = deleteSchema.extend({
  organizationId: idSchema,
  roleId: idSchema,
});
