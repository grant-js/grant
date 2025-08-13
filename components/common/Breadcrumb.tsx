'use client';

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
  const params = useParams();

  // Get current organization and project data using existing hooks
  const { organizations: [organization] = [] } = useOrganizations({
    ids: params.organizationId ? [params.organizationId as string] : undefined,
    limit: 1,
  });

  const { projects: [project] = [] } = useProjects({
    organizationId: params.organizationId as string,
    ids: params.projectId ? [params.projectId as string] : undefined,
    limit: 1,
  });

  // Don't show breadcrumb on home page or auth pages
  if (pathname === '/' || pathname.startsWith('/auth')) {
    return null;
  }

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Add Dashboard as first item
    breadcrumbs.push({
      label: t('navigation.dashboard'),
      href: '/dashboard',
    });

    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      // Skip locale segment
      if (segment === '[locale]' || segment === params.locale) {
        return;
      }

      // Handle dashboard segment
      if (segment === 'dashboard') {
        return;
      }

      // Handle organizations segment
      if (segment === 'organizations') {
        breadcrumbs.push({
          label: t('organizations.title'),
          href: '/dashboard/organizations',
        });
        return;
      }

      // Handle organization ID segment
      if (params.organizationId && segment === params.organizationId) {
        // Show actual organization name if available, fallback to generic label
        const orgLabel = organization?.name || t('organizations.organization');
        breadcrumbs.push({
          label: orgLabel,
          href: `/dashboard/organizations/${segment}`,
        });
        return;
      }

      // Handle projects segment
      if (segment === 'projects') {
        breadcrumbs.push({
          label: t('projects.title'),
          href: `/dashboard/organizations/${params.organizationId}/projects`,
        });
        return;
      }

      // Handle project ID segment
      if (params.projectId && segment === params.projectId) {
        // Show actual project name if available, fallback to generic label
        const projectLabel = project?.name || t('projects.project');
        breadcrumbs.push({
          label: projectLabel,
          href: `/dashboard/organizations/${params.organizationId}/projects/${segment}`,
        });
        return;
      }

      // Handle other segments (like users, roles, etc.)
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

  // Don't show breadcrumb if we only have dashboard
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <BreadcrumbRoot>
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => (
          <BreadcrumbItem key={index}>
            {index > 0 && <BreadcrumbSeparator />}
            {index === breadcrumbs.length - 1 ? (
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link href={item.href || '#'}>{item.label}</Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </BreadcrumbRoot>
  );
}
