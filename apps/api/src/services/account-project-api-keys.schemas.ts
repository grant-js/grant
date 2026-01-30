import { z } from 'zod';

import { baseEntitySchema, idSchema } from './common/schemas';

export const addAccountProjectApiKeyParamsSchema = z.object({
  accountId: idSchema,
  projectId: idSchema,
  apiKeyId: idSchema,
  accountRoleId: idSchema,
});

export const getAccountProjectApiKeysParamsSchema = z.object({
  accountId: idSchema.optional(),
  projectId: idSchema.optional(),
  apiKeyId: idSchema.optional(),
});

export const accountProjectApiKeySchema = baseEntitySchema.extend({
  accountId: idSchema,
  projectId: idSchema,
  apiKeyId: idSchema,
  accountRoleId: idSchema,
});
