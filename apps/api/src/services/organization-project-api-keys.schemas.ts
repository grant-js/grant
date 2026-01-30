import { z } from 'zod';

import { baseEntitySchema, idSchema } from './common/schemas';

export const addOrganizationProjectApiKeyParamsSchema = z.object({
  organizationId: idSchema,
  projectId: idSchema,
  apiKeyId: idSchema,
  organizationRoleId: idSchema,
});

export const getOrganizationProjectApiKeysParamsSchema = z.object({
  organizationId: idSchema.optional(),
  projectId: idSchema.optional(),
  apiKeyId: idSchema.optional(),
});

export const organizationProjectApiKeySchema = baseEntitySchema.extend({
  organizationId: idSchema,
  projectId: idSchema,
  apiKeyId: idSchema,
  organizationRoleId: idSchema,
});
