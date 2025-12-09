'use client';

import { useCallback } from 'react';

import { Building2, Lock, Shield, User, UserCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { NavLink } from './NavLink';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  translationKey: string;
}

export function SettingsNav() {
  const t = useTranslations('settings.navigation');
  const pathname = usePathname();

  const isActive = useCallback(
    (path: string) => {
      return pathname === path || pathname.startsWith(`${path}/`);
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

  const settingsNavItems: NavItem[] = [
    {
      path: '/dashboard/settings/account',
      icon: <Building2 className={iconClasses('/dashboard/settings/account')} />,
      translationKey: 'account',
    },
    {
      path: '/dashboard/settings/profile',
      icon: <User className={iconClasses('/dashboard/settings/profile')} />,
      translationKey: 'profile',
    },
    {
      path: '/dashboard/settings/security',
      icon: <Lock className={iconClasses('/dashboard/settings/security')} />,
      translationKey: 'security',
    },
    {
      path: '/dashboard/settings/preferences',
      icon: <UserCircle className={iconClasses('/dashboard/settings/preferences')} />,
      translationKey: 'preferences',
    },
    {
      path: '/dashboard/settings/privacy',
      icon: <Shield className={iconClasses('/dashboard/settings/privacy')} />,
      translationKey: 'privacy',
    },
  ];

  const renderNavItems = (items: NavItem[]) => (
    <>
      {items.map((item) => (
        <NavLink key={item.path} href={item.path}>
          <div className={cn(navItemClasses(item.path), 'md:flex-none')}>
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
          </div>
        </NavLink>
      ))}
    </>
  );

  return (
    <nav className="md:flex md:flex-col md:h-full">
      {/* Mobile: All items in single row */}
      <div className="grid grid-cols-5 md:hidden gap-1">{renderNavItems(settingsNavItems)}</div>

      {/* Desktop: Vertical layout */}
      <div className="hidden md:flex md:flex-col md:space-y-1">
        {renderNavItems(settingsNavItems)}
      </div>
    </nav>
  );
}
