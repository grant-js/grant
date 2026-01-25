import { z } from 'zod';

import { clientIdSchema, clientSecretSchema } from './api-keys.schemas';
import {
  baseEntitySchema,
  deleteSchema,
  descriptionSchema,
  idSchema,
  nameSchema,
} from './common/schemas';

const dateSchema = z.date().nullable().optional();

export const createProjectUserApiKeyParamsSchema = z.object({
  projectId: idSchema,
  userId: idSchema,
  name: nameSchema.nullable().optional(),
  description: descriptionSchema.nullable().optional(),
  expiresAt: dateSchema.nullable().optional(),
});

export const exchangeProjectUserApiKeyParamsSchema = z.object({
  clientId: clientIdSchema,
  clientSecret: clientSecretSchema,
});

export const revokeProjectUserApiKeyParamsSchema = z.object({
  id: idSchema,
});

export const deleteProjectUserApiKeyParamsSchema = z.object({
  id: idSchema,
  hardDelete: z.boolean().optional(),
});

// Pivot operation schemas
export const addProjectUserApiKeyParamsSchema = z.object({
  projectId: idSchema,
  userId: idSchema,
  apiKeyId: idSchema,
});

export const removeProjectUserApiKeyParamsSchema = deleteSchema.extend({
  projectId: idSchema,
  userId: idSchema,
  apiKeyId: idSchema,
});

export const projectUserApiKeySchema = baseEntitySchema.extend({
  projectId: idSchema,
  userId: idSchema,
  clientId: clientIdSchema,
  clientSecretHash: z.string(),
  name: nameSchema.nullable().optional(),
  description: descriptionSchema.nullable().optional(),
  expiresAt: dateSchema.nullable().optional(),
  lastUsedAt: dateSchema.nullable().optional(),
  isRevoked: z.boolean(),
  revokedAt: dateSchema.nullable().optional(),
  revokedBy: idSchema.nullable().optional(),
  createdBy: idSchema,
});

export const projectUserApiKeyResponseSchema = projectUserApiKeySchema.omit({
  clientSecretHash: true,
});

export const createProjectUserApiKeyResponseSchema = projectUserApiKeyResponseSchema.extend({
  clientSecret: clientSecretSchema,
});

export const exchangeProjectUserApiKeyResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
});
