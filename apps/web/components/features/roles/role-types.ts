import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(2, 'errors.validation.labelMin2'),
  description: z.string().optional(),
  groupIds: z.array(z.string()).optional(),
  permissionIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
  metadataEnabled: z.boolean().optional(),
  metadata: z.any().optional(),
});

export type RoleCreateFormValues = z.infer<typeof createRoleSchema>;

export enum RoleView {
  CARD = 'card',
  TABLE = 'table',
}
