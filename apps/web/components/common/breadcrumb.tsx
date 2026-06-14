'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, usePathname } from '@/i18n/navigation';
import { useGroupsStore } from '@/stores/groups.store';
import { useOrganizationsStore } from '@/stores/organizations.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useProjectAppsStore } from '@/stores/project-apps.store';
import { useProjectSyncJobsStore } from '@/stores/project-sync-jobs.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useResourcesStore } from '@/stores/resources.store';
import { useRolesStore } from '@/stores/roles.store';
import { useUsersStore } from '@/stores/users.store';

export interface BreadCrumbItem {
  label: string;
  href?: string;
}

const DASHBOARD_SEGMENT_LABEL_KEYS: Record<string, string> = {
  users: 'users',
  roles: 'roles',
  groups: 'groups',
  permissions: 'permissions',
  tags: 'tags',
  members: 'members',
  settings: 'settings',
  account: 'account',
  apps: 'projectApps',
  resources: 'resources',
  'api-keys': 'apiKeys',
  'signing-keys': 'signingKeys',
  'import-export': 'projectSyncJobs',
};

function getProjectBasePath(params: ReturnType<typeof useParams>): string {
  return params.organizationId
    ? `/dashboard/organizations/${params.organizationId}`
    : `/dashboard/accounts/${params.accountId}`;
}

export function Breadcrumb() {
  const t = useTranslations('common');
  const dashboardT = useTranslations('dashboard.navigation');
  const pathname = usePathname();
  const params = useParams();

  const currentOrganization = useOrganizationsStore((state) => state.currentOrganization);
  const currentProject = useProjectsStore((state) => state.currentProject);
  const currentUser = useUsersStore((state) => state.currentUser);
  const currentRole = useRolesStore((state) => state.currentRole);
  const currentGroup = useGroupsStore((state) => state.currentGroup);
  const currentPermission = usePermissionsStore((state) => state.currentPermission);
  const currentProjectApp = useProjectAppsStore((state) => state.currentProjectApp);
  const currentSyncJob = useProjectSyncJobsStore((state) => state.currentSyncJob);
  const currentResource = useResourcesStore((state) => state.currentResource);

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
          currentOrganization?.id === params.organizationId
            ? currentOrganization.name
            : t('loading');
        breadcrumbs.push({
          label: orgLabel,
          href: `/dashboard/organizations/${segment}`,
        });
        return;
      }

      if (segment === 'projects') {
        const basePath = getProjectBasePath(params);
        breadcrumbs.push({
          label: t('projects.title'),
          href: `${basePath}/projects`,
        });
        return;
      }

      if (params.projectId && segment === params.projectId) {
        const projectLabel = currentProject?.name || params.projectId || t('projects.project');
        const basePath = getProjectBasePath(params);
        breadcrumbs.push({
          label: projectLabel,
          href: `${basePath}/projects/${segment}`,
        });
        return;
      }

      if (segment in DASHBOARD_SEGMENT_LABEL_KEYS) {
        const labelKey = DASHBOARD_SEGMENT_LABEL_KEYS[segment];
        breadcrumbs.push({
          label: dashboardT(labelKey as 'users'),
          href: currentPath,
        });
        return;
      }

      if (segment === 'new') {
        breadcrumbs.push({
          label: t('actions.create'),
        });
        return;
      }

      if (segment === 'test' && params.appId) {
        breadcrumbs.push({
          label: dashboardT('testApp'),
        });
        return;
      }

      if (params.userId && segment === params.userId) {
        const basePath = getProjectBasePath(params);
        const hasUsersBreadcrumb = breadcrumbs.some((crumb) => crumb.label === dashboardT('users'));
        if (!hasUsersBreadcrumb) {
          const usersHref = params.projectId
            ? `${basePath}/projects/${params.projectId}/users`
            : `${basePath}/users`;
          breadcrumbs.push({
            label: dashboardT('users'),
            href: usersHref,
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

        const userHref = params.projectId
          ? `${basePath}/projects/${params.projectId}/users/${segment}`
          : `${basePath}/users/${segment}`;

        breadcrumbs.push({
          label: userLabel,
          href: userHref,
        });
        return;
      }

      if (params.roleId && segment === params.roleId) {
        const basePath = getProjectBasePath(params);
        const hasRolesBreadcrumb = breadcrumbs.some((crumb) => crumb.label === dashboardT('roles'));
        if (!hasRolesBreadcrumb) {
          const rolesHref = params.projectId
            ? `${basePath}/projects/${params.projectId}/roles`
            : `${basePath}/roles`;
          breadcrumbs.push({
            label: dashboardT('roles'),
            href: rolesHref,
          });
        }

        const roleLabel = currentRole?.name || params.roleId || t('loading');
        const roleHref = params.projectId
          ? `${basePath}/projects/${params.projectId}/roles/${segment}`
          : `${basePath}/roles/${segment}`;

        breadcrumbs.push({
          label: roleLabel,
          href: roleHref,
        });
        return;
      }

      if (params.groupId && segment === params.groupId) {
        const basePath = getProjectBasePath(params);
        const hasGroupsBreadcrumb = breadcrumbs.some(
          (crumb) => crumb.label === dashboardT('groups')
        );
        if (!hasGroupsBreadcrumb) {
          const groupsHref = params.projectId
            ? `${basePath}/projects/${params.projectId}/groups`
            : `${basePath}/groups`;
          breadcrumbs.push({
            label: dashboardT('groups'),
            href: groupsHref,
          });
        }

        const groupLabel = currentGroup?.name || params.groupId || t('loading');
        const groupHref = params.projectId
          ? `${basePath}/projects/${params.projectId}/groups/${segment}`
          : `${basePath}/groups/${segment}`;

        breadcrumbs.push({
          label: groupLabel,
          href: groupHref,
        });
        return;
      }

      if (params.permissionId && segment === params.permissionId) {
        const basePath = getProjectBasePath(params);
        const hasPermissionsBreadcrumb = breadcrumbs.some(
          (crumb) => crumb.label === dashboardT('permissions')
        );
        if (!hasPermissionsBreadcrumb) {
          const permissionsHref = params.projectId
            ? `${basePath}/projects/${params.projectId}/permissions`
            : `${basePath}/permissions`;
          breadcrumbs.push({
            label: dashboardT('permissions'),
            href: permissionsHref,
          });
        }

        const permissionLabel = currentPermission?.name || params.permissionId || t('loading');
        const permissionHref = params.projectId
          ? `${basePath}/projects/${params.projectId}/permissions/${segment}`
          : `${basePath}/permissions/${segment}`;

        breadcrumbs.push({
          label: permissionLabel,
          href: permissionHref,
        });
        return;
      }

      if (params.appId && segment === params.appId) {
        const basePath = getProjectBasePath(params);

        const hasAppsBreadcrumb = breadcrumbs.some(
          (crumb) => crumb.label === dashboardT('projectApps')
        );
        if (!hasAppsBreadcrumb) {
          breadcrumbs.push({
            label: dashboardT('projectApps'),
            href: `${basePath}/projects/${params.projectId}/apps`,
          });
        }

        const appLabel =
          currentProjectApp?.name || currentProjectApp?.clientId || params.appId || t('loading');
        breadcrumbs.push({
          label: appLabel,
          href: `${basePath}/projects/${params.projectId}/apps/${segment}`,
        });
        return;
      }

      if (params.resourceId && segment === params.resourceId) {
        const basePath = getProjectBasePath(params);
        const hasResourcesBreadcrumb = breadcrumbs.some(
          (crumb) => crumb.label === dashboardT('resources')
        );
        if (!hasResourcesBreadcrumb) {
          breadcrumbs.push({
            label: dashboardT('resources'),
            href: `${basePath}/projects/${params.projectId}/resources`,
          });
        }

        const resourceLabel = currentResource?.name || params.resourceId || t('loading');
        breadcrumbs.push({
          label: resourceLabel,
          href: `${basePath}/projects/${params.projectId}/resources/${segment}`,
        });
        return;
      }

      if (params.jobId && segment === params.jobId) {
        const basePath = getProjectBasePath(params);
        const hasImportExportBreadcrumb = breadcrumbs.some(
          (crumb) => crumb.label === dashboardT('projectSyncJobs')
        );
        if (!hasImportExportBreadcrumb) {
          breadcrumbs.push({
            label: dashboardT('projectSyncJobs'),
            href: `${basePath}/projects/${params.projectId}/import-export`,
          });
        }

        const jobLabel =
          currentSyncJob?.jobName ||
          (currentSyncJob?.id === params.jobId ? currentSyncJob.id : null) ||
          params.jobId ||
          t('loading');
        breadcrumbs.push({
          label: jobLabel,
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
