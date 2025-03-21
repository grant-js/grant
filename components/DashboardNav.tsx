'use client';

import { useTranslations } from 'next-intl';
import { NavLink } from './NavLink';
import { Users, UserCircle, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCallback } from 'react';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  translationKey: string;
}

export function DashboardNav() {
  const t = useTranslations('dashboard.navigation');
  const pathname = usePathname();

  const isActive = useCallback(
    (path: string) => {
      return pathname.endsWith(path);
    },
    [pathname]
  );

  const navItemClasses = useCallback(
    (path: string) => {
      return cn(
        'flex items-center rounded-md transition-colors',
        isActive(path) ? 'bg-accent' : 'hover:bg-accent/50'
      );
    },
    [isActive]
  );

  const iconClasses = useCallback(
    (path: string) => {
      return cn('h-4 w-4', isActive(path) ? 'text-accent-foreground' : 'text-muted-foreground');
    },
    [isActive]
  );

  const textClasses = useCallback(
    (path: string) => {
      return cn(isActive(path) ? 'text-accent-foreground font-medium' : 'text-muted-foreground');
    },
    [isActive]
  );

  const navItems: NavItem[] = [
    {
      path: '/dashboard/users',
      icon: <Users className={iconClasses('/dashboard/users')} />,
      translationKey: 'users',
    },
    {
      path: '/dashboard/account',
      icon: <UserCircle className={iconClasses('/dashboard/account')} />,
      translationKey: 'account',
    },
    {
      path: '/dashboard/settings',
      icon: <Settings className={iconClasses('/dashboard/settings')} />,
      translationKey: 'settings',
    },
  ];

  return (
    <nav className="flex flex-col space-y-1">
      {navItems.map((item) => (
        <div key={item.path} className={navItemClasses(item.path)}>
          <NavLink href={item.path}>
            <div className="flex items-center space-x-2 px-3 py-2">
              {item.icon}
              <span className={textClasses(item.path)}>{t(item.translationKey)}</span>
            </div>
          </NavLink>
        </div>
      ))}
    </nav>
  );
}
