'use client';

import { useCallback } from 'react';

import { useParams } from 'next/navigation';

import { Group, Key, Shield, Tag, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { ProjectSwitcher } from '../features/projects/ProjectSwitcher';

import { NavLink } from './NavLink';

// We can reuse the ProjectSwitcher component as it should work with both organizations and accounts

interface NavItem {
  path: string;
  icon: React.ReactNode;
  translationKey: string;
}

export function PersonalProjectNav() {
  const t = useTranslations('dashboard.navigation');
  const pathname = usePathname();
  const params = useParams();
  const accountId = params.accountId as string;
  const projectId = params.projectId as string;

  const isActive = useCallback(
    (path: string) => {
      // Match exact path or nested routes (e.g., /users matches /users and /users/[userId])
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

  const personalProjectNavItems: NavItem[] = [
    {
      path: `/dashboard/accounts/${accountId}/projects/${projectId}/users`,
      icon: (
        <Users
          className={iconClasses(`/dashboard/accounts/${accountId}/projects/${projectId}/users`)}
        />
      ),
      translationKey: 'users',
    },
    {
      path: `/dashboard/accounts/${accountId}/projects/${projectId}/roles`,
      icon: (
        <Shield
          className={iconClasses(`/dashboard/accounts/${accountId}/projects/${projectId}/roles`)}
        />
      ),
      translationKey: 'roles',
    },
    {
      path: `/dashboard/accounts/${accountId}/projects/${projectId}/groups`,
      icon: (
        <Group
          className={iconClasses(`/dashboard/accounts/${accountId}/projects/${projectId}/groups`)}
        />
      ),
      translationKey: 'groups',
    },
    {
      path: `/dashboard/accounts/${accountId}/projects/${projectId}/permissions`,
      icon: (
        <Key
          className={iconClasses(
            `/dashboard/accounts/${accountId}/projects/${projectId}/permissions`
          )}
        />
      ),
      translationKey: 'permissions',
    },
    {
      path: `/dashboard/accounts/${accountId}/projects/${projectId}/tags`,
      icon: (
        <Tag
          className={iconClasses(`/dashboard/accounts/${accountId}/projects/${projectId}/tags`)}
        />
      ),
      translationKey: 'projectTags',
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
      <div className="flex flex-col mb-4 space-y-2">
        <ProjectSwitcher />
      </div>

      {/* Mobile: All items in single row */}
      <div className="grid grid-cols-5 md:hidden">{renderNavItems(personalProjectNavItems)}</div>

      {/* Desktop: Vertical layout */}
      <div className="hidden md:flex md:flex-col md:space-y-1">
        {renderNavItems(personalProjectNavItems)}
      </div>
    </nav>
  );
}
