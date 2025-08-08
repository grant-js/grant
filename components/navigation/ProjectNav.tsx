'use client';

import { useCallback } from 'react';

import { Users, Shield, Group, Key } from 'lucide-react';
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

export function ProjectNav() {
  const t = useTranslations('dashboard.navigation');
  const pathname = usePathname();
  const scope = useScopeFromParams();
  const { id: projectId } = scope;

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

  const projectNavItems: NavItem[] = [
    {
      path: `/dashboard/project/${projectId}/users`,
      icon: <Users className={iconClasses(`/dashboard/project/${projectId}/users`)} />,
      translationKey: 'users',
    },
    {
      path: `/dashboard/project/${projectId}/roles`,
      icon: <Shield className={iconClasses(`/dashboard/project/${projectId}/roles`)} />,
      translationKey: 'roles',
    },
    {
      path: `/dashboard/project/${projectId}/groups`,
      icon: <Group className={iconClasses(`/dashboard/project/${projectId}/groups`)} />,
      translationKey: 'groups',
    },
    {
      path: `/dashboard/project/${projectId}/permissions`,
      icon: <Key className={iconClasses(`/dashboard/project/${projectId}/permissions`)} />,
      translationKey: 'permissions',
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
      {/* Back to Organization */}
      {/* <div className="mb-4 p-2">
        <NavLink href={`/dashboard/org/${organizationId}`}>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Organization</span>
          </div>
        </NavLink>
      </div> */}

      {/* Mobile: All items in single row */}
      <div className="grid grid-cols-4 md:hidden">{renderNavItems(projectNavItems)}</div>

      {/* Desktop: Vertical layout */}
      <div className="hidden md:flex md:flex-col md:space-y-1">
        {renderNavItems(projectNavItems)}
      </div>
    </nav>
  );
}
