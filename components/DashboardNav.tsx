'use client';

import { useTranslations } from 'next-intl';
import { NavLink } from './NavLink';
import { Users, UserCircle, Settings } from 'lucide-react';
import { usePathname } from '@/i18n/navigation';
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
        'flex items-center justify-center md:justify-start transition-colors w-full',
        isActive(path) ? 'bg-accent md:rounded-md' : 'hover:bg-accent/50 md:rounded-md'
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
    <nav className="grid grid-cols-3 md:flex md:flex-col md:space-y-1">
      {navItems.map((item) => (
        <div key={item.path} className={cn(navItemClasses(item.path), 'md:flex-none')}>
          <NavLink href={item.path}>
            <div className="flex flex-col md:flex-row items-center justify-center md:justify-start space-y-1 md:space-y-0 md:space-x-2 px-3 py-2">
              {item.icon}
              <span
                className={cn(
                  'text-xs md:text-sm text-center md:text-left',
                  textClasses(item.path)
                )}
              >
                {t(item.translationKey)}
              </span>
            </div>
          </NavLink>
        </div>
      ))}
    </nav>
  );
}
