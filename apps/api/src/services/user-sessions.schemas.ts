import { z } from 'zod';

import { baseEntitySchema, idSchema } from './common/schemas';

export const userSessionSchema = baseEntitySchema.extend({
  userId: idSchema,
  token: z.string(),
  audience: z.string(),
  userAuthenticationMethodId: idSchema,
  expiresAt: z.date(),
  emailVerified: z.boolean().optional(),
  mfaVerifiedAt: z.date().nullable().optional(),
  lastUsedAt: z.date().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  user: z.any().nullable().optional(),
  authMethod: z.any().nullable().optional(),
});

// Session creation with JWT token generation
export const createSessionSchema = z.object({
  userId: idSchema,
  userAuthenticationMethodId: idSchema,
  userAgent: z.string().max(500).nullable().optional(),
  ipAddress: z.string().max(45).nullable().optional(),
  mfaVerifiedAt: z.date().nullable().optional(),
});

export const updateUserSessionSchema = z.object({
  id: idSchema,
  lastUsedAt: z.date().nullable().optional(),
  mfaVerifiedAt: z.date().nullable().optional(),
  userAgent: z.string().max(500).nullable().optional(),
  ipAddress: z.string().max(45).nullable().optional(),
});

export const sessionResultSchema = z.object({
  refreshToken: z.string(),
  accessToken: z.string(),
});
