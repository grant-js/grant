import { z } from 'zod';

import { Role } from '@/graphql/generated/types';

// Form schemas
export const createRoleSchema = z.object({
  name: z.string().min(2, 'Label must be at least 2 characters'),
  description: z.string().optional(),
  groupIds: z.array(z.string()).optional(),
});

export const editRoleSchema = z.object({
  name: z.string().min(2, 'Label must be at least 2 characters'),
  description: z.string().optional(),
  groupIds: z.array(z.string()).optional(),
});

// Form types
export type CreateRoleFormValues = z.infer<typeof createRoleSchema>;
export type EditRoleFormValues = z.infer<typeof editRoleSchema>;

// Component props
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

// Query result types
export interface RolesQueryResult {
  roles: {
    roles: Role[];
    totalCount: number;
    hasNextPage: boolean;
  };
}
