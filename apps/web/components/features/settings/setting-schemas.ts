import { z } from 'zod';

import { passwordPolicySchema } from '@/lib/validation/password-policy';

export const changePasswordSchema = z
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

export const addEmailAuthMethodSchema = z
  .object({
    email: z.email('errors.validation.invalidEmail'),
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, 'errors.validation.confirmPasswordRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'errors.validation.passwordMismatch',
    path: ['confirmPassword'],
  });

export const profileSettingsSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'errors.validation.displayNameRequired' })
    .min(2, { message: 'errors.validation.displayNameMin2' })
    .max(100, { message: 'errors.validation.displayNameMax100' }),
});
