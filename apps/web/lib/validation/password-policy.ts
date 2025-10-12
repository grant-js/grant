import { z } from 'zod';

// Shared Password Policy Configuration
// This should be kept in sync between frontend and backend
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

// Client-side password validation schema
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
    const specialChars = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;
    return specialChars.test(password);
  }, `Password must contain at least ${passwordPolicyConfig.minSpecialChars} special character(s)`)
  .refine((password) => {
    return !passwordPolicyConfig.forbiddenPatterns.some((pattern) => pattern.test(password));
  }, 'Password contains forbidden patterns (e.g., too many repeated characters or common weak passwords)')
  .refine((password) => {
    const lowerPassword = password.toLowerCase();
    return !passwordPolicyConfig.forbiddenSequences.some((seq) => lowerPassword.includes(seq));
  }, 'Password must not contain sequential characters (e.g., abc, 123)');

// Password strength checker for real-time feedback
export function getPasswordStrength(password: string) {
  if (!password) return { score: 0, strength: 'weak', checks: {}, isValid: false };

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
}

// Helper to get password requirements text for UI
export function getPasswordRequirements() {
  return [
    `At least ${passwordPolicyConfig.minLength} characters`,
    passwordPolicyConfig.requireUppercase ? 'One uppercase letter' : null,
    passwordPolicyConfig.requireLowercase ? 'One lowercase letter' : null,
    passwordPolicyConfig.requireNumbers ? 'One number' : null,
    passwordPolicyConfig.requireSpecialChars ? 'One special character' : null,
    'No sequential characters (abc, 123)',
    'No repeated characters (aaa, 111)',
    'No common passwords',
  ].filter(Boolean) as string[];
}
