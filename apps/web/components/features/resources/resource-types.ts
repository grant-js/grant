import { Resource } from '@grantjs/schema';
import { z } from 'zod';

export const createResourceSchema = z.object({
  name: z.string().min(2, 'Label must be at least 2 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().optional(),
  actions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export const editResourceSchema = z.object({
  name: z.string().min(2, 'Label must be at least 2 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().optional(),
  actions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export type ResourceCreateFormValues = z.infer<typeof createResourceSchema>;
export type ResourceEditFormValues = z.infer<typeof editResourceSchema>;

export interface ResourceCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface ResourceEditDialogProps {
  resource: Resource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPage: number;
}

export enum ResourceView {
  CARD = 'card',
  TABLE = 'table',
}
