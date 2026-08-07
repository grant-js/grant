import {
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { z } from 'zod';

import { baseEntitySchema, deleteSchema, idSchema, requestedFieldsSchema } from './common/schemas';

const userAuthenticationMethodProviderSchema = z.enum(
  Object.values(UserAuthenticationMethodProvider) as [
    UserAuthenticationMethodProvider,
    ...UserAuthenticationMethodProvider[],
  ]
);

const providerDataSchema = z.record(z.string(), z.unknown());

export const createUserAuthenticationMethodInputSchema = z.object({
  userId: idSchema,
  provider: userAuthenticationMethodProviderSchema,
  providerId: z
    .string()
    .min(1, 'errors.validation.providerIdRequired')
    .max(255, 'errors.validation.providerIdTooLong'),
  providerData: providerDataSchema.nullable().optional(),
  password: z.string().min(1, 'errors.validation.passwordRequired').nullable().optional(),
  isVerified: z.boolean().nullable().optional(),
  isPrimary: z.boolean().nullable().optional(),
});

export const updateUserAuthenticationMethodInputSchema = z.object({
  providerId: z.string().nullable().optional(),
  providerData: providerDataSchema.nullable().optional(),
  password: z.string().min(1, 'errors.validation.passwordRequired').nullable().optional(),
  isVerified: z.boolean().nullable().optional(),
  isPrimary: z.boolean().nullable().optional(),
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
  providerData: providerDataSchema,
  isVerified: z.boolean(),
  isPrimary: z.boolean(),
  lastUsedAt: z.date().nullable().optional(),
  user: z.any().nullable().optional(),
});

export const parseProviderDataSchema = z.object({
  providerId: z.string(),
  provider: userAuthenticationMethodProviderSchema,
  providerData: providerDataSchema,
});

// Password Policy Configuration
const passwordPolicyConfig = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minSpecialChars: 1,
  forbiddenPatterns: [
    /(.)\1{2,}/, // No more than 2 consecutive identical characters
    /^(password|123456|qwerty|admin|user|guest)$/i, // Common weak passwords
  ],
  forbiddenSequences: [
    'abc',
    'bcd',
    'cde',
    'def',
    'efg',
    'fgh',
    'ghi',
    'hij',
    'ijk',
    'jkl',
    'klm',
    'lmn',
    'mno',
    'nop',
    'opq',
    'pqr',
    'qrs',
    'rst',
    'stu',
    'tuv',
    'uvw',
    'vwx',
    'wxy',
    'xyz',
    '123',
    '234',
    '345',
    '456',
    '567',
    '678',
    '789',
    '890',
  ],
} as const;

// Enhanced password schema with comprehensive validation
export const passwordPolicySchema = z
  .string()
  .min(1, 'errors.validation.passwordRequired')
  .min(
    passwordPolicyConfig.minLength,
    `Password must be at least ${passwordPolicyConfig.minLength} characters`
  )
  .max(
    passwordPolicyConfig.maxLength,
    `Password must not exceed ${passwordPolicyConfig.maxLength} characters`
  )
  .refine(
    (password) => !passwordPolicyConfig.requireUppercase || /[A-Z]/.test(password),
    'errors.validation.passwordUppercase'
  )
  .refine(
    (password) => !passwordPolicyConfig.requireLowercase || /[a-z]/.test(password),
    'errors.validation.passwordLowercase'
  )
  .refine(
    (password) => !passwordPolicyConfig.requireNumbers || /\d/.test(password),
    'errors.validation.passwordNumber'
  )
  .refine((password) => {
    if (!passwordPolicyConfig.requireSpecialChars) return true;
    const specialChars = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;
    return specialChars.test(password);
  }, `Password must contain at least ${passwordPolicyConfig.minSpecialChars} special character(s)`)
  .refine((password) => {
    return !passwordPolicyConfig.forbiddenPatterns.some((pattern) => pattern.test(password));
  }, 'errors.validation.passwordForbiddenPatterns')
  .refine((password) => {
    const lowerPassword = password.toLowerCase();
    return !passwordPolicyConfig.forbiddenSequences.some((seq) => lowerPassword.includes(seq));
  }, 'errors.validation.passwordSequential');

// Email provider data schema
export const emailProviderDataSchema = z.object({
  password: z.string().min(1, 'errors.validation.passwordRequired'),
  action: z.enum(
    Object.values(UserAuthenticationEmailProviderAction) as [
      UserAuthenticationEmailProviderAction,
      ...UserAuthenticationEmailProviderAction[],
    ]
  ),
});

// GitHub provider data schema
export const githubProviderDataSchema = z.object({
  accessToken: z.string().min(1, 'errors.validation.githubAccessTokenRequired'),
  githubId: z.union([z.number(), z.string()]).transform((val) => {
    // Normalize to number
    return typeof val === 'number' ? val : parseInt(val, 10);
  }),
  email: z
    .union([z.string().email(), z.string().length(0), z.null()])
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional(),
  name: z.string().nullable().optional(),
  avatarUrl: z
    .union([z.string().url(), z.string().length(0), z.null()])
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional(),
});
