import { z } from 'zod';

import { baseEntitySchema, deleteSchema, idSchema } from './common/schemas';

export const getGroupPermissionsParamsSchema = z
  .object({
    groupId: idSchema.optional(),
    permissionId: idSchema.optional(),
  })
  .refine((data) => data.groupId || data.permissionId, {
    message: 'errors.validation.eitherGroupIdOrPermissionIdRequired',
  });

export const addGroupPermissionParamsSchema = z.object({
  groupId: idSchema,
  permissionId: idSchema,
});

export const addGroupPermissionsForCdmImportParamsSchema = z.object({
  links: z.array(addGroupPermissionParamsSchema),
});

export const removeGroupPermissionParamsSchema = deleteSchema.extend({
  groupId: idSchema,
  permissionId: idSchema,
});

export const groupPermissionSchema = baseEntitySchema.extend({
  groupId: idSchema,
  permissionId: idSchema,
});
