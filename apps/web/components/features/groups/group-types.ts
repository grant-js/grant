import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(2, 'errors.validation.nameMin2'),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
  metadataEnabled: z.boolean().optional(),
  metadata: z.any().optional(),
});

export type GroupCreateFormValues = z.infer<typeof createGroupSchema>;

export enum GroupView {
  CARDS = 'cards',
  TABLE = 'table',
}
