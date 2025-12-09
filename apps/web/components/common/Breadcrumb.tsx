'use client';

import React from 'react';

import { useParams } from 'next/navigation';

import { useTranslations } from 'next-intl';

import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Link, usePathname } from '@/i18n/navigation';
import { useOrganizationsStore } from '@/stores/organizations.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useUsersStore } from '@/stores/users.store';

interface BreadcrumbItem {
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

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

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

  return (
    <BreadcrumbRoot>
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href || '#'}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </BreadcrumbRoot>
  );
}
