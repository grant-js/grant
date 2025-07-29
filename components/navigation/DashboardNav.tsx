'use client';

import { useCallback } from 'react';

import { Users, UserCircle, Settings, Shield, Group } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { NavLink } from './NavLink';

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

  const mainNavItems: NavItem[] = [
    {
      path: '/dashboard/users',
      icon: <Users className={iconClasses('/dashboard/users')} />,
      translationKey: 'users',
    },
    {
      path: '/dashboard/roles',
      icon: <Shield className={iconClasses('/dashboard/roles')} />,
      translationKey: 'roles',
    },
    {
      path: '/dashboard/groups',
      icon: <Group className={iconClasses('/dashboard/groups')} />,
      translationKey: 'groups',
    },
  ];

  const accountNavItems: NavItem[] = [
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

  const renderNavItems = (items: NavItem[]) => (
    <>
      {items.map((item) => (
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
    </>
  );

  return (
    <nav className="md:flex md:flex-col md:h-full">
      {/* Mobile: All items in single row */}
      <div className="grid grid-cols-5 md:hidden">
        {renderNavItems([...mainNavItems, ...accountNavItems])}
      </div>

      {/* Desktop: Separated sections */}
      <div className="hidden md:flex md:flex-col md:h-full">
        {/* Main Navigation - Top */}
        <div className="md:flex md:flex-col md:space-y-1">{renderNavItems(mainNavItems)}</div>

        {/* Account Navigation - Bottom */}
        <div className="md:flex md:flex-col md:space-y-1 md:mt-auto md:pt-4">
          {renderNavItems(accountNavItems)}
        </div>
      </div>
    </nav>
  );
}
