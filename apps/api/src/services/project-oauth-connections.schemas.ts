import { ProjectOAuthConnectionProvider } from '@grantjs/schema';
import { z } from 'zod';

import { idSchema } from './common/schemas';

const providerSchema = z.enum([
  ProjectOAuthConnectionProvider.Github,
  ProjectOAuthConnectionProvider.Google,
]);

export const listProjectOAuthConnectionsParamsSchema = z.object({
  projectId: idSchema,
});

export const upsertProjectOAuthConnectionParamsSchema = z.object({
  projectId: idSchema,
  provider: providerSchema,
  clientId: z
    .string()
    .trim()
    .min(1, 'errors.validation.clientIdRequired')
    .max(255, 'errors.validation.clientIdTooLong'),
  clientSecret: z
    .string()
    .min(1, 'errors.validation.clientSecretRequired')
    .max(4096, 'errors.validation.clientSecretTooLong'),
});

export const clearProjectOAuthConnectionParamsSchema = z.object({
  projectId: idSchema,
  provider: providerSchema,
});

export const projectOAuthConnectionOutputSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    provider: providerSchema,
    clientId: z.string(),
    isConfigured: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
    deletedAt: z.date().nullable().optional(),
  })
  .strict();
