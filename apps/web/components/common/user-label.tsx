import { getUserEmail, type UserEmailSource } from '@/lib/user-email';
import { cn } from '@/lib/utils';

export interface UserLabelProps {
  user: UserEmailSource & { name: string };
  className?: string;
}

/**
 * A user as a relationship lists them: the name, then the email muted beside it when the user
 * has one. Names are not unique, so the email tells two people of the same name apart. Each part
 * truncates on its own, and the full email is in the title.
 */
export function UserLabel({ user, className }: UserLabelProps) {
  const email = getUserEmail(user);
  return (
    <span className={cn('flex min-w-0 items-baseline gap-1.5', className)}>
      <span className="truncate">{user.name}</span>
      {email ? (
        <span
          className="min-w-0 truncate text-xs text-muted-foreground"
          title={email}
          data-testid="user-label-email"
        >
          {email}
        </span>
      ) : null}
    </span>
  );
}
