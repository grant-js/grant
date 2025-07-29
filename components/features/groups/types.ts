import { z } from 'zod';

import { Group } from '@/graphql/generated/types';

// Form schemas
export const createGroupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});

export const editGroupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});

// Form types
export type CreateGroupFormValues = z.infer<typeof createGroupSchema>;
export type EditGroupFormValues = z.infer<typeof editGroupSchema>;

// Component props
export interface CreateGroupDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface EditGroupDialogProps {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPage: number;
}

// Query result types
export interface GroupsQueryResult {
  groups: {
    groups: Group[];
    totalCount: number;
    hasNextPage: boolean;
  };
}
