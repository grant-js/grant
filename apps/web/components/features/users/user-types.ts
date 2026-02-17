import { User } from '@grantjs/schema';
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(3, 'errors.validation.nameMin3'),
  roleIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
  metadata: z.any().optional(),
});

export const editUserSchema = z.object({
  name: z.string().min(3, 'errors.validation.nameMin3'),
  roleIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
  metadata: z.any().optional(),
});

export type UserCreateFormValues = z.infer<typeof createUserSchema>;
export type UserEditFormValues = z.infer<typeof editUserSchema>;

export interface UserCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface UserEditDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export enum UserView {
  CARD = 'card',
  TABLE = 'table',
}
