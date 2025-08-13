'use client';

import { useCallback } from 'react';

import { Users, Tag, FolderOpen } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { OrganizationSwitcher } from '../features/organizations/OrganizationSwitcher';

import { NavLink } from './NavLink';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  translationKey: string;
}

export function OrganizationNav() {
  const t = useTranslations('dashboard.navigation');
  const pathname = usePathname();
  const params = useParams();
  const organizationId = params.organizationId as string;

  const isActive = useCallback(
    (path: string) => {
      return pathname.includes(path);
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
      path: `/dashboard/organizations/${organizationId}/projects`,
      icon: (
        <FolderOpen
          className={iconClasses(`/dashboard/organizations/${organizationId}/projects`)}
        />
      ),
      translationKey: 'projects',
    },
    {
      path: `/dashboard/organizations/${organizationId}/members`,
      icon: <Users className={iconClasses(`/dashboard/organizations/${organizationId}/members`)} />,
      translationKey: 'members',
    },
    {
      path: `/dashboard/organizations/${organizationId}/tags`,
      icon: <Tag className={iconClasses(`/dashboard/organizations/${organizationId}/tags`)} />,
      translationKey: 'organizationTags',
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
      <div className="mb-4">
        <OrganizationSwitcher />
      </div>

      {/* Mobile: All items in single row */}
      <div className="grid grid-cols-3 md:hidden gap-1">{renderNavItems(organizationNavItems)}</div>

      {/* Desktop: Vertical layout */}
      <div className="hidden md:flex md:flex-col md:space-y-1">
        {renderNavItems(organizationNavItems)}
      </div>
    </nav>
  );
}
