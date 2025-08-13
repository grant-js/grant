'use client';

import { useCallback } from 'react';

import { Users, Shield, Group, Key, Tag } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { ProjectSwitcher } from '../features/projects/ProjectSwitcher';

import { NavLink } from './NavLink';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  translationKey: string;
}

export function ProjectNav() {
  const t = useTranslations('dashboard.navigation');
  const pathname = usePathname();
  const params = useParams();
  const organizationId = params.organizationId as string;
  const projectId = params.projectId as string;

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
      path: `/dashboard/organizations/${organizationId}/projects/${projectId}/users`,
      icon: (
        <Users
          className={iconClasses(
            `/dashboard/organizations/${organizationId}/projects/${projectId}/users`
          )}
        />
      ),
      translationKey: 'users',
    },
    {
      path: `/dashboard/organizations/${organizationId}/projects/${projectId}/roles`,
      icon: (
        <Shield
          className={iconClasses(
            `/dashboard/organizations/${organizationId}/projects/${projectId}/roles`
          )}
        />
      ),
      translationKey: 'roles',
    },
    {
      path: `/dashboard/organizations/${organizationId}/projects/${projectId}/groups`,
      icon: (
        <Group
          className={iconClasses(
            `/dashboard/organizations/${organizationId}/projects/${projectId}/groups`
          )}
        />
      ),
      translationKey: 'groups',
    },
    {
      path: `/dashboard/organizations/${organizationId}/projects/${projectId}/permissions`,
      icon: (
        <Key
          className={iconClasses(
            `/dashboard/organizations/${organizationId}/projects/${projectId}/permissions`
          )}
        />
      ),
      translationKey: 'permissions',
    },
    {
      path: `/dashboard/organizations/${organizationId}/projects/${projectId}/tags`,
      icon: (
        <Tag
          className={iconClasses(
            `/dashboard/organizations/${organizationId}/projects/${projectId}/tags`
          )}
        />
      ),
      translationKey: 'projectTags',
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
      <div className="flex flex-col mb-4 space-y-2">
        <ProjectSwitcher />
      </div>

      {/* Mobile: All items in single row */}
      <div className="grid grid-cols-5 md:hidden">{renderNavItems(projectNavItems)}</div>

      {/* Desktop: Vertical layout */}
      <div className="hidden md:flex md:flex-col md:space-y-1">
        {renderNavItems(projectNavItems)}
      </div>
    </nav>
  );
}
