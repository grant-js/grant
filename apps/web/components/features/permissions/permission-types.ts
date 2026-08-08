import { permissionConditionSchema } from '@grantjs/core';
import { z } from 'zod';

/** Action: letters, digits, hyphen, plus only (no spaces). */
const actionSlugRegex = /^[A-Za-z0-9+-]+$/;

export const createPermissionSchema = z.object({
  name: z.string().min(2, 'errors.validation.nameMin2'),
  action: z
    .string()
    .min(1, 'errors.validation.actionRequired')
    .regex(actionSlugRegex, 'errors.validation.actionInvalidFormat'),
  description: z.string().optional(),
  resourceId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
  conditionEnabled: z.boolean().optional(),
  condition: permissionConditionSchema,
});

export type PermissionCreateFormValues = z.infer<typeof createPermissionSchema>;

export enum PermissionView {
  CARD = 'card',
  TABLE = 'table',
}
