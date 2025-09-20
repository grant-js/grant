import { z } from 'zod';

import { UserAuthenticationMethodProvider } from '@/graphql/generated/types';

import {
  idSchema,
  baseEntitySchema,
  paginatedResponseSchema,
  deleteSchema,
  requestedFieldsSchema,
} from '../common/schemas';

export const userAuthenticationMethodProviderSchema = z.enum(
  Object.values(UserAuthenticationMethodProvider) as [
    UserAuthenticationMethodProvider,
    ...UserAuthenticationMethodProvider[],
  ]
);

export const providerDataSchema = z.record(z.unknown());

export const createUserAuthenticationMethodInputSchema = z.object({
  userId: idSchema,
  provider: userAuthenticationMethodProviderSchema,
  providerId: z.string().min(1, 'Provider ID is required').max(255, 'Provider ID too long'),
  providerData: providerDataSchema.nullable().optional(),
  password: z.string().min(1, 'Password is required').nullable().optional(),
  isVerified: z.boolean().nullable().optional(),
  isPrimary: z.boolean().nullable().optional(),
});

export const updateUserAuthenticationMethodInputSchema = z.object({
  providerId: z.string().nullable().optional(),
  providerData: providerDataSchema.nullable().optional(),
  password: z.string().min(1, 'Password is required').nullable().optional(),
  isVerified: z.boolean().nullable().optional(),
  isPrimary: z.boolean().nullable().optional(),
});

export const updateUserAuthenticationMethodArgsSchema = z.object({
  id: idSchema,
  input: updateUserAuthenticationMethodInputSchema,
});

export const deleteUserAuthenticationMethodArgsSchema = deleteSchema.extend({
  id: idSchema,
});

export const queryUserAuthenticationMethodsArgsSchema = z.object({
  userId: idSchema,
  requestedFields: requestedFieldsSchema,
});

export const userAuthenticationMethodSchema = baseEntitySchema.extend({
  userId: idSchema,
  provider: userAuthenticationMethodProviderSchema,
  providerId: z.string(),
  providerData: providerDataSchema.nullable().optional(),
  isVerified: z.boolean(),
  isPrimary: z.boolean(),
  lastUsedAt: z.date().nullable().optional(),
  user: z.any().nullable().optional(),
});

export const userAuthenticationMethodPageSchema = paginatedResponseSchema(
  userAuthenticationMethodSchema
).transform((data) => ({
  userAuthenticationMethods: data.items,
  hasNextPage: data.hasNextPage,
  totalCount: data.totalCount,
}));

export const validateTokenSchema = z.object({
  provider: userAuthenticationMethodProviderSchema,
  token: z.string(),
});

export const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  token: z.string(),
});
