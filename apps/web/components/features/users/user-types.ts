import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(3, 'errors.validation.nameMin3'),
  roleIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
  permissionIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
  metadataEnabled: z.boolean().optional(),
  metadata: z.any().optional(),
});

export type UserCreateFormValues = z.infer<typeof createUserSchema>;

export enum UserView {
  CARD = 'card',
  TABLE = 'table',
}
