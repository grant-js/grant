import { z } from 'zod';

import { deleteSchema, idSchema } from './common/schemas';

// Pivot operation schemas
export const addProjectUserApiKeyParamsSchema = z.object({
  projectId: idSchema,
  userId: idSchema,
  apiKeyId: idSchema,
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const removeProjectUserApiKeyParamsSchema = deleteSchema.extend({
  projectId: idSchema,
  userId: idSchema,
  apiKeyId: idSchema,
});
