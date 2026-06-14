import { AuthorizationReason } from '@grantjs/schema';

import { normalizePermissionSlug } from '@/lib/permission-normalizer';
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
  permission: z
    .object({
      resource: z.string().min(1, 'errors.validation.resourceRequired'),
      action: z.string().min(1, 'errors.validation.actionRequired'),
    })
    .openapi({
      description:
        'Resource slug and action to check. Grant unions all grant paths (role/group/direct) before matching.',
    })
    .transform((p) => ({
      resource: normalizePermissionSlug(p.resource),
      action: normalizePermissionSlug(p.action),
    }))
    .refine((p) => p.resource.length > 0, {
      message: 'errors.validation.resourceRequired',
      path: ['resource'],
    })
    .refine((p) => p.action.length > 0, {
      message: 'errors.validation.actionRequired',
      path: ['action'],
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
