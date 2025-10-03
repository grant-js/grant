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
  email: z.string().email('Invalid email address'),
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
  .min(1, 'Password is required')
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
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => !passwordPolicyConfig.requireLowercase || /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => !passwordPolicyConfig.requireNumbers || /\d/.test(password),
    'Password must contain at least one number'
  )
  .refine((password) => {
    if (!passwordPolicyConfig.requireSpecialChars) return true;
    const specialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?~`]/;
    return specialChars.test(password);
  }, `Password must contain at least ${passwordPolicyConfig.minSpecialChars} special character(s)`)
  .refine((password) => {
    return !passwordPolicyConfig.forbiddenPatterns.some((pattern) => pattern.test(password));
  }, 'Password contains forbidden patterns (e.g., too many repeated characters or common weak passwords)')
  .refine((password) => {
    const lowerPassword = password.toLowerCase();
    return !passwordPolicyConfig.forbiddenSequences.some((seq) => lowerPassword.includes(seq));
  }, 'Password must not contain sequential characters (e.g., abc, 123)');

// Password confirmation schema for forms
export const passwordConfirmationSchema = z
  .object({
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
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
    specialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
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
    token: z.string().min(1, 'Reset token is required'),
    newPassword: passwordPolicySchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Password change schema (requires current password)
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordPolicySchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });
