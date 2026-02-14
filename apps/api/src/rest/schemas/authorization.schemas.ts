import { AuthorizationReason } from '@grantjs/schema';

import { z } from '@/lib/zod-openapi.lib';
import {
  createSuccessResponseSchema,
  jsonSchema,
  scopeSchema,
} from '@/rest/schemas/common.schemas';

export const authorizationReasonEnum = z.enum(
  Object.values(AuthorizationReason) as [AuthorizationReason, ...AuthorizationReason[]]
);

export const authorizationResultSchema = z.object({
  authorized: z.boolean(),
  reason: authorizationReasonEnum.nullable().optional(),
  matchedPermission: z.unknown().nullable().optional(),
  matchedCondition: z.unknown().nullable().optional(),
  evaluatedContext: z.unknown().nullable().optional(),
});

export const isAuthorizedRequestSchema = z.object({
  permission: z.object({
    resource: z.string().min(1, 'Resource slug is required'),
    action: z.string().min(1, 'Action is required'),
  }),
  context: z
    .object({
      resource: jsonSchema.nullable().optional(),
    })
    .openapi({
      description: 'Context for authorization check',
      example: {
        resource: {
          id: '123',
        },
      },
    }),
  scope: scopeSchema.optional().openapi({
    description:
      'Optional scope override. Only effective for session tokens (API keys use their embedded scope).',
  }),
});

export const isAuthorizedResponseSchema = createSuccessResponseSchema(authorizationResultSchema);
