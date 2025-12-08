import { z } from '@/lib/zod-openapi.lib';

export const projectUserApiKeyParamsSchema = z.object({
  projectId: z.uuid('Invalid project ID'),
  userId: z.uuid('Invalid user ID'),
});

export const apiKeyIdParamsSchema = z.object({
  id: z.uuid('Invalid API key ID'),
});

export const createProjectUserApiKeyRequestSchema = z.object({
  projectId: z.uuid('Invalid project ID'),
  userId: z.uuid('Invalid user ID'),
  name: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const exchangeProjectUserApiKeyRequestSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  clientSecret: z.string().min(32, 'Client secret must be at least 32 characters'),
});

export const revokeProjectUserApiKeyRequestSchema = z.object({
  id: z.uuid('Invalid API key ID'),
});

export const deleteProjectUserApiKeyRequestSchema = z.object({
  id: z.uuid('Invalid API key ID'),
  hardDelete: z.boolean().optional(),
});

export const getProjectUserApiKeysQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().min(-1).default(50).optional(),
  search: z.string().optional(),
  sort: z
    .object({
      field: z.enum(['name', 'createdAt', 'lastUsedAt', 'expiresAt']),
      order: z.enum(['ASC', 'DESC']),
    })
    .optional(),
});
