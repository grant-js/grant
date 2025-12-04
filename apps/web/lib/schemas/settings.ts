import { z } from 'zod';

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
