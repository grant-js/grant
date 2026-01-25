'use client';

import React from 'react';

import { useParams } from 'next/navigation';

import { useTranslations } from 'next-intl';

import {
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, usePathname } from '@/i18n/navigation';
import { useOrganizationsStore } from '@/stores/organizations.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useUsersStore } from '@/stores/users.store';

export interface BreadCrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb() {
  const t = useTranslations('common');
  const dashboardT = useTranslations('dashboard.navigation');
  const pathname = usePathname();
  const params = useParams();

  const currentOrganization = useOrganizationsStore((state) => state.currentOrganization);
  const currentProject = useProjectsStore((state) => state.currentProject);
  const currentUser = useUsersStore((state) => state.currentUser);

  if (pathname === '/' || pathname.startsWith('/auth')) {
    return null;
  }

  const generateBreadcrumbs = (): BreadCrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadCrumbItem[] = [];

    breadcrumbs.push({
      label: t('navigation.dashboard'),
      href: '/dashboard',
    });

    let currentPath = '';

    segments.forEach((segment) => {
      currentPath += `/${segment}`;

      if (segment === '[locale]' || segment === params.locale) {
        return;
      }

      if (segment === 'dashboard') {
        return;
      }

      if (segment === 'organizations') {
        breadcrumbs.push({
          label: t('organizations.title'),
          href: '/dashboard/organizations',
        });
        return;
      }

      if (params.organizationId && segment === params.organizationId) {
        const orgLabel =
          currentOrganization?.name || params.organizationId || t('organizations.organization');
        breadcrumbs.push({
          label: orgLabel,
          href: `/dashboard/organizations/${segment}`,
        });
        return;
      }

      if (segment === 'projects') {
        const basePath = params.organizationId
          ? `/dashboard/organizations/${params.organizationId}`
          : `/dashboard/accounts/${params.accountId}`;
        breadcrumbs.push({
          label: t('projects.title'),
          href: `${basePath}/projects`,
        });
        return;
      }

      if (params.projectId && segment === params.projectId) {
        const projectLabel = currentProject?.name || params.projectId || t('projects.project');
        const basePath = params.organizationId
          ? `/dashboard/organizations/${params.organizationId}`
          : `/dashboard/accounts/${params.accountId}`;
        breadcrumbs.push({
          label: projectLabel,
          href: `${basePath}/projects/${segment}`,
        });
        return;
      }

      if (
        [
          'users',
          'roles',
          'groups',
          'permissions',
          'tags',
          'members',
          'settings',
          'account',
        ].includes(segment)
      ) {
        const label = dashboardT(segment) || segment;
        breadcrumbs.push({
          label,
          href: currentPath,
        });
        return;
      }

      if (params.userId && segment === params.userId) {
        // Always show "Users" before the user name when on a user detail page
        const basePath = params.organizationId
          ? `/dashboard/organizations/${params.organizationId}`
          : `/dashboard/accounts/${params.accountId}`;

        // Check if "Users" breadcrumb is already added, if not add it
        const hasUsersBreadcrumb = breadcrumbs.some((crumb) => crumb.label === dashboardT('users'));
        if (!hasUsersBreadcrumb) {
          breadcrumbs.push({
            label: dashboardT('users'),
            href: `${basePath}/projects/${params.projectId}/users`,
          });
        }

        // Show user name, userId, or "Loading" based on availability
        let userLabel: string;
        if (currentUser?.name) {
          userLabel = currentUser.name;
        } else if (params.userId) {
          userLabel = params.userId;
        } else {
          userLabel = t('loading');
        }

        breadcrumbs.push({
          label: userLabel,
          href: `${basePath}/projects/${params.projectId}/users/${segment}`,
        });
        return;
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  const ITEMS_TO_DISPLAY = 3; // Root + last 2 segments
  const shouldCollapse = breadcrumbs.length > ITEMS_TO_DISPLAY;
  const collapsedItems = shouldCollapse ? breadcrumbs.slice(1, breadcrumbs.length - 2) : [];
  const lastTwoItems = breadcrumbs.slice(-2);

  return (
    <BreadcrumbRoot>
      <BreadcrumbList>
        {/* Always show root breadcrumb */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={breadcrumbs[0].href || '#'}>{breadcrumbs[0].label}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Show ellipsis dropdown if there are collapsed items */}
        {shouldCollapse && collapsedItems.length > 0 && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1">
                  <BreadcrumbEllipsis className="size-4" />
                  <span className="sr-only">Toggle menu</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {collapsedItems.map((collapsedItem, collapsedIndex) => (
                    <DropdownMenuItem key={collapsedIndex} asChild>
                      <Link href={collapsedItem.href || '#'}>{collapsedItem.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
          </>
        )}

        {shouldCollapse
          ? /* Show last 2 items when collapsed */
            lastTwoItems.map((item, index) => {
              const isLast = index === lastTwoItems.length - 1;
              return (
                <React.Fragment key={index}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={item.href || '#'}>{item.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              );
            })
          : /* Show all remaining items when not collapsed (<= 3 total) */
            breadcrumbs.slice(1).map((item, index) => {
              const isLast = index === breadcrumbs.slice(1).length - 1;
              return (
                <React.Fragment key={index}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={item.href || '#'}>{item.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              );
            })}
      </BreadcrumbList>
    </BreadcrumbRoot>
  );
}
