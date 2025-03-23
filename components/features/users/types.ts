import { User as GeneratedUser } from '@/graphql/generated/types';
import { z } from 'zod';

// Re-export the User type from generated types
export type User = GeneratedUser;

// Form schemas
export const createUserSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  roleIds: z.array(z.string()).min(1, 'User must have at least one role'),
});

export const editUserSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  roleIds: z.array(z.string()).min(1, 'User must have at least one role'),
});

// Form types
export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type EditUserFormValues = z.infer<typeof editUserSchema>;

// Component props
export interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPage: number;
}

// Query result types
export interface UsersQueryResult {
  users: {
    users: User[];
    totalCount: number;
    hasNextPage: boolean;
  };
}
