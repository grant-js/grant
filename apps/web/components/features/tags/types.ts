import { Tag } from '@logusgraphics/grant-schema';
import { z } from 'zod';

// Form schemas
export const createTagSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  color: z.string().min(1, 'Color is required'),
});

export const editTagSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  color: z.string().min(1, 'Color is required'),
});

// Form types
export type CreateTagFormValues = z.infer<typeof createTagSchema>;
export type EditTagFormValues = z.infer<typeof editTagSchema>;

// Component props
export interface CreateTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface EditTagDialogProps {
  tag: Tag | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
