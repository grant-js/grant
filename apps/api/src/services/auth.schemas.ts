import { z } from 'zod';

import { jsonSchema } from './common';

export const isAuthorizedInputSchema = z.object({
  permission: z.object({
    resource: z.string().min(1, 'Resource slug is required'),
    action: z.string().min(1, 'Action is required'),
  }),
  context: z
    .object({
      resource: jsonSchema.nullable().optional(),
    })
    .optional(),
});

export const authorizationResultSchema = z.object({
  authorized: z.boolean(),
  reason: z.string().nullable().optional(),
  matchedPermission: z.unknown().nullable().optional(),
  matchedCondition: z.unknown().nullable().optional(),
  evaluatedContext: z.unknown().nullable().optional(),
});
