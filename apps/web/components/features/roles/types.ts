import { Role } from '@logusgraphics/grant-schema';
import { z } from 'zod';

// Form schemas
export const createRoleSchema = z.object({
  name: z.string().min(2, 'Label must be at least 2 characters'),
  description: z.string().optional(),
  groupIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export const editRoleSchema = z.object({
  name: z.string().min(2, 'Label must be at least 2 characters'),
  description: z.string().optional(),
  groupIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export type CreateRoleFormValues = z.infer<typeof createRoleSchema>;
export type EditRoleFormValues = z.infer<typeof editRoleSchema>;

export interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface EditRoleDialogProps {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPage: number;
}
