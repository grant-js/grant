import {
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { z } from 'zod';

import {
  baseEntitySchema,
  deleteSchema,
  idSchema,
  paginatedResponseSchema,
  requestedFieldsSchema,
} from './common/schemas';

export const userAuthenticationMethodProviderSchema = z.enum(
  Object.values(UserAuthenticationMethodProvider) as [
    UserAuthenticationMethodProvider,
    ...UserAuthenticationMethodProvider[],
  ]
);

export const providerDataSchema = z.record(z.string(), z.unknown());

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
  providerData: providerDataSchema,
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
  email: z.string().email('errors.validation.invalidEmail'),
  token: z.string(),
});

export const parseProviderDataSchema = z.object({
  providerId: z.string(),
  provider: userAuthenticationMethodProviderSchema,
  providerData: providerDataSchema,
});

// Password Policy Configuration
export const passwordPolicyConfig = {
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

// Password confirmation schema for forms
export const passwordConfirmationSchema = z
  .object({
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, 'errors.validation.confirmPasswordRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'errors.validation.passwordMismatch',
    path: ['confirmPassword'],
  });

// Password strength checker schema (returns strength level)
export const passwordStrengthSchema = z.string().transform((password) => {
  let score = 0;
  const checks = {
    length: password.length >= passwordPolicyConfig.minLength,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    specialChars: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password),
    noRepeats: !passwordPolicyConfig.forbiddenPatterns[0].test(password),
    noSequences: !passwordPolicyConfig.forbiddenSequences.some((seq) =>
      password.toLowerCase().includes(seq)
    ),
    noCommonPasswords: !passwordPolicyConfig.forbiddenPatterns
      .slice(1)
      .some((pattern) => pattern.test(password)),
  };

  // Calculate score
  Object.values(checks).forEach((check) => {
    if (check) score++;
  });

  // Determine strength level
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (score <= 3) strength = 'weak';
  else if (score <= 5) strength = 'fair';
  else if (score <= 6) strength = 'good';
  else strength = 'strong';

  return {
    score,
    strength,
    checks,
    isValid: score >= 6, // Require at least 6/8 checks to pass
  };
});

// Password reset schema with additional validation
export const passwordResetSchema = z
  .object({
    token: z.string().min(1, 'errors.validation.tokenRequired'),
    newPassword: passwordPolicySchema,
    confirmPassword: z.string().min(1, 'errors.validation.confirmPasswordRequired'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'errors.validation.passwordMismatch',
    path: ['confirmPassword'],
  });

// Password change schema (requires current password)
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'errors.validation.currentPasswordRequired'),
    newPassword: passwordPolicySchema,
    confirmPassword: z.string().min(1, 'errors.validation.confirmPasswordRequired'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'errors.validation.passwordMismatch',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'errors.validation.newPasswordDifferent',
    path: ['newPassword'],
  });

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
