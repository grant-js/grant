import { z } from 'zod';

/** Action slug: lowercase, letters, digits, hyphens and plus only (matches API validation). */
const actionSlugSchema = z
  .string()
  .min(1, 'errors.validation.actionRequired')
  .regex(/^[a-z0-9+-]+$/, 'errors.validation.actionInvalidFormat');

export const createResourceSchema = z.object({
  name: z.string().min(2, 'errors.validation.labelMin2'),
  slug: z
    .string()
    .min(2, 'errors.validation.slugMin2')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().optional(),
  actions: z.array(actionSlugSchema).optional(),
  isActive: z.boolean().optional(),
  createPermissions: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export type ResourceCreateFormValues = z.infer<typeof createResourceSchema>;

export enum ResourceView {
  CARD = 'card',
  TABLE = 'table',
}
