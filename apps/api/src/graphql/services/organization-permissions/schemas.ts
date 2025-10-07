import { z } from 'zod';

import { deleteSchema, idSchema } from '../common/schemas';

export const queryOrganizationPermissionsArgsSchema = z.object({
  organizationId: idSchema,
});

export const addOrganizationPermissionInputSchema = z.object({
  organizationId: idSchema.refine(
    (organizationId) => organizationId.trim().length > 0,
    'Organization ID is required'
  ),
  permissionId: idSchema.refine(
    (permissionId) => permissionId.trim().length > 0,
    'Permission ID is required'
  ),
});

export const removeOrganizationPermissionInputSchema = deleteSchema.extend({
  organizationId: idSchema.refine(
    (organizationId) => organizationId.trim().length > 0,
    'Organization ID is required'
  ),
  permissionId: idSchema.refine(
    (permissionId) => permissionId.trim().length > 0,
    'Permission ID is required'
  ),
});

export const addOrganizationPermissionArgsSchema = z.object({
  input: addOrganizationPermissionInputSchema,
});

export const removeOrganizationPermissionArgsSchema = z.object({
  input: removeOrganizationPermissionInputSchema,
});

export const organizationPermissionSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  permissionId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
  organization: z.any().nullable().optional(),
  permission: z.any().nullable().optional(),
});
