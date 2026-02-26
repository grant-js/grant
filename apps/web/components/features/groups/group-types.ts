import { Group } from '@grantjs/schema';
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

export const editGroupSchema = z.object({
  name: z.string().min(2, 'errors.validation.nameMin2'),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
  metadataEnabled: z.boolean().optional(),
  metadata: z.any().optional(),
});

export type GroupCreateFormValues = z.infer<typeof createGroupSchema>;
export type GroupEditFormValues = z.infer<typeof editGroupSchema>;

export interface GroupCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface GroupEditDialogProps {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPage: number;
}

export interface GroupsQueryResult {
  groups: {
    groups: Group[];
    totalCount: number;
    hasNextPage: boolean;
  };
}

export enum GroupView {
  CARDS = 'cards',
  TABLE = 'table',
}
