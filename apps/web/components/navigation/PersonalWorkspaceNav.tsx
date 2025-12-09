'use client';

import { useCallback } from 'react';

import { useParams } from 'next/navigation';

import { FolderOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { NavLink } from './NavLink';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  translationKey: string;
}

export function PersonalWorkspaceNav() {
  const t = useTranslations('dashboard.navigation');
  const pathname = usePathname();
  const params = useParams();
  const accountId = params.accountId as string;

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

  const accountNavItems: NavItem[] = [
    {
      path: `/dashboard/accounts/${accountId}/projects`,
      icon: <FolderOpen className={iconClasses(`/dashboard/accounts/${accountId}/projects`)} />,
      translationKey: 'projects',
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
      <div className="grid grid-cols-1 md:hidden gap-1">{renderNavItems(accountNavItems)}</div>

      {/* Desktop: Vertical layout */}
      <div className="hidden md:flex md:flex-col md:space-y-1">
        {renderNavItems(accountNavItems)}
      </div>
    </nav>
  );
}
