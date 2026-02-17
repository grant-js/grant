import { Role } from '@grantjs/schema';
import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(2, 'errors.validation.labelMin2'),
  description: z.string().optional(),
  groupIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
  metadata: z.any().optional(),
});

export const editRoleSchema = z.object({
  name: z.string().min(2, 'errors.validation.labelMin2'),
  description: z.string().optional(),
  groupIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
  metadata: z.any().optional(),
});

export type RoleCreateFormValues = z.infer<typeof createRoleSchema>;
export type RoleEditFormValues = z.infer<typeof editRoleSchema>;

export interface RoleCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface RoleEditDialogProps {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPage: number;
}

export enum RoleView {
  CARD = 'card',
  TABLE = 'table',
}
