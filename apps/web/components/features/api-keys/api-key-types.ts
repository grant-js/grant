import { addDays, startOfDay } from 'date-fns';
import { z } from 'zod';

import {
  type ApiKeyExpirationPreset,
  apiKeyPresetExpirationDate,
} from '@/components/common/api-key-expiration-presets-field';

const expirationPresetSchema = z.enum(['7d', '30d', '60d', '90d', 'custom', 'none']);

const apiKeyBaseShape = {
  name: z.string().optional(),
  description: z.string().optional(),
  expirationPreset: expirationPresetSchema,
  expiresAt: z.date().optional(),
};

type ApiKeyExpirationFields = {
  expirationPreset: ApiKeyExpirationPreset;
  expiresAt?: Date;
};

function refineApiKeyExpiration(data: ApiKeyExpirationFields, ctx: z.RefinementCtx) {
  if (data.expirationPreset !== 'custom') {
    return;
  }
  if (!data.expiresAt) {
    ctx.addIssue({
      code: 'custom',
      path: ['expiresAt'],
      message: 'errors.validation.expirationCustomRequired',
    });
    return;
  }
  const min = startOfDay(addDays(new Date(), 1));
  if (startOfDay(data.expiresAt).getTime() < min.getTime()) {
    ctx.addIssue({
      code: 'custom',
      path: ['expiresAt'],
      message: 'errors.validation.expirationMustBeFuture',
    });
  }
}

/** Keys that carry no role or permissions: the project-user keys of the create dialog. */
export const createApiKeySchema = z.object(apiKeyBaseShape).superRefine(refineApiKeyExpiration);

export type ApiKeyCreateFormValues = z.infer<typeof createApiKeySchema>;

/** Project keys carry exactly one of a role or permissions, chosen first and with no default. */
export const createProjectApiKeySchema = z
  .object({
    ...apiKeyBaseShape,
    grantKind: z.enum(['role', 'scopes']).optional(),
    roleId: z.string().optional(),
    permissionIds: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    refineApiKeyExpiration(data, ctx);

    if (data.grantKind === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['grantKind'],
        message: 'user.apiKeys.validation.grantKindRequired',
      });
      return;
    }
    if (data.grantKind === 'role' && !data.roleId) {
      ctx.addIssue({
        code: 'custom',
        path: ['roleId'],
        message: 'user.apiKeys.validation.roleRequired',
      });
    }
    if (data.grantKind === 'scopes' && data.permissionIds.length < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['permissionIds'],
        message: 'user.apiKeys.validation.scopesRequired',
      });
    }
  });

export type ProjectApiKeyCreateFormValues = z.infer<typeof createProjectApiKeySchema>;

export function resolveApiKeyExpiration(
  preset: ApiKeyExpirationPreset,
  custom?: Date
): Date | undefined {
  switch (preset) {
    case 'none':
      return undefined;
    case '7d':
    case '30d':
    case '60d':
    case '90d':
      return apiKeyPresetExpirationDate(preset);
    case 'custom':
      return custom;
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}
