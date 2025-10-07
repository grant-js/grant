import { z } from 'zod';

import { idSchema, baseEntitySchema, deleteSchema } from '../common/schemas';

export const getOrganizationUsersParamsSchema = z.object({
  organizationId: idSchema,
});

export const addOrganizationUserParamsSchema = z.object({
  organizationId: idSchema,
  userId: idSchema,
});

export const removeOrganizationUserParamsSchema = deleteSchema.extend({
  organizationId: idSchema,
  userId: idSchema,
});

export const organizationUserSchema = baseEntitySchema.extend({
  organizationId: idSchema,
  userId: idSchema,
});
