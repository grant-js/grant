'use client';

import React from 'react';

import { usePathname, useParams } from 'next/navigation';

import { useTranslations } from 'next-intl';

import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useProjectScope } from '@/hooks/common/useProjectScope';
import { useOrganizations } from '@/hooks/organizations';
import { useProjects } from '@/hooks/projects';
import { Link } from '@/i18n/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb() {
  const t = useTranslations('common');
  const dashboardT = useTranslations('dashboard.navigation');
  const pathname = usePathname();
  const scope = useProjectScope();
  const params = useParams();

  const { organizations: [organization] = [] } = useOrganizations({
    ids: params.organizationId ? [params.organizationId as string] : undefined,
    limit: 1,
  });

  const { projects: [project] = [] } = useProjects({
    scope: scope!,
    ids: params.projectId ? [params.projectId as string] : undefined,
    limit: 1,
  });

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
        const orgLabel = organization?.name || t('organizations.organization');
        breadcrumbs.push({
          label: orgLabel,
          href: `/dashboard/organizations/${segment}`,
        });
        return;
      }

      if (segment === 'projects') {
        breadcrumbs.push({
          label: t('projects.title'),
          href: `/dashboard/organizations/${params.organizationId}/projects`,
        });
        return;
      }

      if (params.projectId && segment === params.projectId) {
        const projectLabel = project?.name || t('projects.project');
        breadcrumbs.push({
          label: projectLabel,
          href: `/dashboard/organizations/${params.organizationId}/projects/${segment}`,
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
