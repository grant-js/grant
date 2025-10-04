import { z } from 'zod';

import { Tenant } from '@/graphql/generated/types';

import {
  idSchema,
  baseEntitySchema,
  paginatedResponseSchema,
  deleteSchema,
  requestedFieldsSchema,
  tenantSchema,
} from '../common/schemas';

export const sessionScopeSchema = z.enum(Object.values(Tenant) as [string, ...string[]]);

export const createUserSessionInputSchema = z.object({
  userId: idSchema,
  authMethodId: idSchema,
  scope: sessionScopeSchema,
  scopeId: idSchema,
  expiresAt: z.date(),
  userAgent: z.string().max(500, 'User agent too long').nullable().optional(),
  ipAddress: z.string().max(45, 'IP address too long').nullable().optional(),
});

export const updateUserSessionInputSchema = z.object({
  lastUsedAt: z.date().nullable().optional(),
  userAgent: z.string().max(500, 'User agent too long').nullable().optional(),
  ipAddress: z.string().max(45, 'IP address too long').nullable().optional(),
});

export const updateUserSessionArgsSchema = z.object({
  id: idSchema,
  input: updateUserSessionInputSchema,
});

export const deleteUserSessionArgsSchema = deleteSchema.extend({
  id: idSchema,
});

export const queryUserSessionsArgsSchema = z.object({
  userId: idSchema.optional(),
  scope: sessionScopeSchema.optional(),
  scopeId: idSchema.optional(),
  requestedFields: requestedFieldsSchema,
});

export const userSessionSchema = baseEntitySchema.extend({
  userId: idSchema,
  token: z.string(),
  scopeTenant: tenantSchema,
  scopeId: idSchema,
  userAuthenticationMethodId: idSchema,
  expiresAt: z.date(),
  lastUsedAt: z.date().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  user: z.any().nullable().optional(),
  authMethod: z.any().nullable().optional(),
});

export const userSessionPageSchema = paginatedResponseSchema(userSessionSchema).transform(
  (data) => ({
    userSessions: data.items,
    hasNextPage: data.hasNextPage,
    totalCount: data.totalCount,
  })
);

// Session creation with JWT token generation
export const createSessionSchema = z.object({
  userId: idSchema,
  userAuthenticationMethodId: idSchema,
  scopeTenant: tenantSchema,
  scopeId: idSchema,
  userAgent: z.string().max(500).nullable().optional(),
  ipAddress: z.string().max(45).nullable().optional(),
});

// Token validation schema
export const validateAccessTokenSchema = z.object({
  accessToken: z.string().min(1, 'Token is required'),
});

// Session refresh schema
export const refreshSessionSchema = z.object({
  accessToken: z.string().min(1, 'Token is required'),
  refreshToken: z.string().min(1, 'Token is required'),
});

// Bulk session operations
export const revokeUserSessionsSchema = z.object({
  userId: idSchema,
  excludeSessionId: idSchema.optional(), // Don't revoke current session
});

export const cleanupExpiredSessionsSchema = z.object({
  olderThanDays: z.number().int().min(1).max(365).default(30),
});

export const updateUserSessionSchema = z.object({
  id: idSchema,
  lastUsedAt: z.date().nullable().optional(),
  userAgent: z.string().max(500).nullable().optional(),
  ipAddress: z.string().max(45).nullable().optional(),
});

export const sessionResultSchema = z.object({
  refreshToken: z.string(),
  accessToken: z.string(),
});
