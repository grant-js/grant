import { z } from 'zod';

import { User } from '@/graphql/generated/types';

// Form schemas
export const createUserSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  roleIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
});

export const editUserSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  roleIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
});

// Form types
export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type EditUserFormValues = z.infer<typeof editUserSchema>;

// Component props
export interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
