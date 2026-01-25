import { z } from 'zod';

import { passwordPolicySchema } from '@/lib/validation/password-policy';

export const changePasswordSchema = z
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

export const addEmailAuthMethodSchema = z
  .object({
    email: z.email('Please enter a valid email address'),
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const profileSettingsSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Display name is required' })
    .min(2, { message: 'Display name must be at least 2 characters' })
    .max(100, { message: 'Display name must be less than 100 characters' }),
});
