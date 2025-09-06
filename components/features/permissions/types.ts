import { z } from 'zod';

import { Permission } from '@/graphql/generated/types';

export const createPermissionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  action: z.string().min(2, 'Action must be at least 2 characters'),
  description: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export const editPermissionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  action: z.string().min(2, 'Action must be at least 2 characters'),
  description: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export type CreatePermissionFormValues = z.infer<typeof createPermissionSchema>;
export type EditPermissionFormValues = z.infer<typeof editPermissionSchema>;

export interface CreatePermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface EditPermissionDialogProps {
  permission: Permission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface PermissionsQueryResult {
  permissions: {
    permissions: Permission[];
    totalCount: number;
    hasNextPage: boolean;
  };
}
