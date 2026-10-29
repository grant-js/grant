import { z } from 'zod';

import { passwordPolicySchema } from '@/lib/validation/password-policy';

export const createUserSchema = z.object({
  name: z.string().min(3, 'errors.validation.nameMin3'),
  email: z.union([z.email('errors.validation.invalidEmail'), z.literal('')]).optional(),
  roleIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
  permissionIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
  metadataEnabled: z.boolean().optional(),
  metadata: z.any().optional(),
});

// Operator-set password: the same client policy the settings password form uses, plus a
// match check. The API enforces the policy again; this is only early feedback.
export const setProjectUserPasswordSchema = z
  .object({
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, 'errors.validation.confirmPasswordRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'errors.validation.passwordMismatch',
    path: ['confirmPassword'],
  });

export type SetProjectUserPasswordFormValues = z.infer<typeof setProjectUserPasswordSchema>;

export type UserCreateFormValues = z.infer<typeof createUserSchema>;

export enum UserView {
  CARD = 'card',
  TABLE = 'table',
}
