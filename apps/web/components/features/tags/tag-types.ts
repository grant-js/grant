import { Tag } from '@grantjs/schema';
import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  color: z.string().min(1, 'Color is required'),
});

export const editTagSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  color: z.string().min(1, 'Color is required'),
});

export type TagCreateFormValues = z.infer<typeof createTagSchema>;
export type TagEditFormValues = z.infer<typeof editTagSchema>;

export interface TagCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface TagEditDialogProps {
  tag: Tag | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export enum TagView {
  CARD = 'card',
  TABLE = 'table',
}
