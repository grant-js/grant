import { z } from 'zod';

import { idSchema, baseEntitySchema, deleteSchema } from '../common/schemas';

export const getGroupPermissionsParamsSchema = z.object({
  groupId: idSchema,
});

export const addGroupPermissionParamsSchema = z.object({
  groupId: idSchema,
  permissionId: idSchema,
});

export const removeGroupPermissionParamsSchema = deleteSchema.extend({
  groupId: idSchema,
  permissionId: idSchema,
});

export const groupPermissionSchema = baseEntitySchema.extend({
  groupId: idSchema,
  permissionId: idSchema,
});
