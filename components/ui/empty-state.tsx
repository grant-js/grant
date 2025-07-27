import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * EmptyState component for displaying a consistent empty state across the application.
 *
 * Features:
 * - Horizontally and vertically centered layout
 * - Consistent styling with dashed border and proper spacing
 * - Optional action button or component
 * - Customizable icon, title, and description
 * - Supports different states (no data vs no search results)
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<UserPlus className="h-12 w-12" />}
 *   title="No users found"
 *   description="Get started by creating your first user"
 *   action={<CreateUserDialog />}
 * />
 * ```
 */
interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex items-center justify-center min-h-[400px] w-full', className)}>
      <div className="text-center py-10 border-2 border-dashed rounded-lg w-full max-w-md">
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">{icon}</div>
        <h3 className="text-lg font-semibold text-gray-500 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{description}</p>
        {action && <div className="flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
