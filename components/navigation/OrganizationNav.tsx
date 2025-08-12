'use client';

import { useCallback } from 'react';

import { Users, Shield, Group, Key, Tag, FolderOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { NavLink } from './NavLink';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  translationKey: string;
}

export function OrganizationNav() {
  const t = useTranslations('dashboard.navigation');
  const pathname = usePathname();
  const scope = useScopeFromParams();
  const { id: organizationId } = scope;

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

  const organizationNavItems: NavItem[] = [
    {
      path: `/dashboard/org/${organizationId}/projects`,
      icon: <FolderOpen className={iconClasses(`/dashboard/org/${organizationId}/projects`)} />,
      translationKey: 'projects',
    },
    {
      path: `/dashboard/org/${organizationId}/users`,
      icon: <Users className={iconClasses(`/dashboard/org/${organizationId}/users`)} />,
      translationKey: 'users',
    },
    {
      path: `/dashboard/org/${organizationId}/roles`,
      icon: <Shield className={iconClasses(`/dashboard/org/${organizationId}/roles`)} />,
      translationKey: 'roles',
    },
    {
      path: `/dashboard/org/${organizationId}/groups`,
      icon: <Group className={iconClasses(`/dashboard/org/${organizationId}/groups`)} />,
      translationKey: 'groups',
    },
    {
      path: `/dashboard/org/${organizationId}/permissions`,
      icon: <Key className={iconClasses(`/dashboard/org/${organizationId}/permissions`)} />,
      translationKey: 'permissions',
    },
    {
      path: `/dashboard/org/${organizationId}/tags`,
      icon: <Tag className={iconClasses(`/dashboard/org/${organizationId}/tags`)} />,
      translationKey: 'tags',
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
      <div className="grid grid-cols-6 md:hidden gap-1">{renderNavItems(organizationNavItems)}</div>

      {/* Desktop: Vertical layout */}
      <div className="hidden md:flex md:flex-col md:space-y-1">
        {renderNavItems(organizationNavItems)}
      </div>
    </nav>
  );
}
