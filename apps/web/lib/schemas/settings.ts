import { z } from 'zod';

/**
 * Account Information Settings Schema
 */
export const accountSettingsSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Account name is required' })
    .min(2, { message: 'Account name must be at least 2 characters' })
    .max(100, { message: 'Account name must be less than 100 characters' }),
  slug: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters' })
    .max(50, { message: 'Username must be less than 50 characters' })
    .regex(/^[a-z0-9-]+$/, {
      message: 'Username can only contain lowercase letters, numbers, and hyphens',
    }),
});

export type AccountSettingsFormValues = z.infer<typeof accountSettingsSchema>;

/**
 * Profile Settings Schema
 */
export const profileSettingsSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Display name is required' })
    .min(2, { message: 'Display name must be at least 2 characters' })
    .max(100, { message: 'Display name must be less than 100 characters' }),
});

export type ProfileSettingsFormValues = z.infer<typeof profileSettingsSchema>;

