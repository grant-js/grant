'use client';

import { usePathname } from 'next/navigation';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  'data-active'?: string | boolean;
}

export function NavLink({
  href,
  children,
  onClick,
  className,
  'data-active': dataActive,
  ...props
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      data-active={dataActive}
      className={cn(
        'transition-colors hover:text-foreground/80',
        isActive ? 'text-foreground' : 'text-foreground/60',
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
