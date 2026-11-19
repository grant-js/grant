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
import { useMyProjectMembership } from '@/hooks/me';
import { Link, usePathname } from '@/i18n/navigation';
import { buildBreadcrumbs } from '@/lib/breadcrumbs';
import { useApiKeyStore } from '@/stores/api-key.store';
import { useAuthStore } from '@/stores/auth.store';
import { useGroupsStore } from '@/stores/groups.store';
import { useOrganizationsStore } from '@/stores/organizations.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useProjectAppsStore } from '@/stores/project-apps.store';
import { useProjectSyncJobsStore } from '@/stores/project-sync-jobs.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useResourcesStore } from '@/stores/resources.store';
import { useRolesStore } from '@/stores/roles.store';
import { useUsersStore } from '@/stores/users.store';
import { useWebhooksStore } from '@/stores/webhooks.store';

export function Breadcrumb() {
  const t = useTranslations('common');
  const dashboardT = useTranslations('dashboard.navigation');
  const settingsNavT = useTranslations('settings.navigation');
  const pathname = usePathname();
  const params = useParams();

  const isSettingsPath = pathname.startsWith('/dashboard/settings');
  const settingsMembershipProjectId =
    isSettingsPath && typeof params.projectId === 'string' ? params.projectId : null;
  const { membership: settingsMembership } = useMyProjectMembership(settingsMembershipProjectId);

  const currentOrganization = useOrganizationsStore((state) => state.currentOrganization);
  const currentProject = useProjectsStore((state) => state.currentProject);
  const currentUser = useUsersStore((state) => state.currentUser);
  const currentRole = useRolesStore((state) => state.currentRole);
  const currentGroup = useGroupsStore((state) => state.currentGroup);
  const currentPermission = usePermissionsStore((state) => state.currentPermission);
  const currentProjectApp = useProjectAppsStore((state) => state.currentProjectApp);
  const currentSyncJob = useProjectSyncJobsStore((state) => state.currentSyncJob);
  const currentResource = useResourcesStore((state) => state.currentResource);
  const currentSubscription = useWebhooksStore((state) => state.currentSubscription);
  const currentApiKey = useApiKeyStore((state) => state.currentApiKey);
  const accounts = useAuthStore((state) => state.accounts);

  if (pathname === '/' || pathname.startsWith('/auth')) {
    return null;
  }

  // A store's current entity names the crumb only when it is the one in the path.
  const nameIf = <T extends { id: string }>(
    entity: T | null | undefined,
    id: unknown,
    name: (entity: T) => string | null | undefined
  ) => (entity && entity.id === id ? name(entity) : undefined);
  const currentAccount = accounts.find((account) => account.id === params.accountId);

  const breadcrumbs = buildBreadcrumbs({
    pathname,
    params: params as Record<string, string | string[] | undefined>,
    t: (key) => t(key as never),
    dashboardT: (key) => dashboardT(key as never),
    settingsNavT: (key) => settingsNavT(key as never),
    names: {
      organizationId: nameIf(currentOrganization, params.organizationId, (o) => o.name),
      accountId: currentAccount ? t(`accountTypes.${currentAccount.type}` as never) : undefined,
      projectId: nameIf(currentProject, params.projectId, (p) => p.name),
      settingsProjectId: settingsMembership?.projectName,
      userId: nameIf(currentUser, params.userId, (u) => u.name),
      roleId: nameIf(currentRole, params.roleId, (r) => r.name),
      groupId: nameIf(currentGroup, params.groupId, (g) => g.name),
      permissionId: nameIf(currentPermission, params.permissionId, (p) => p.name),
      appId: nameIf(currentProjectApp, params.appId, (a) => a.name || a.clientId),
      resourceId: nameIf(currentResource, params.resourceId, (r) => r.name),
      jobId: nameIf(currentSyncJob, params.jobId, (j) => j.jobName),
      subscriptionId: nameIf(
        currentSubscription,
        params.subscriptionId,
        (s) => s.description || s.url
      ),
      apiKeyId: nameIf(currentApiKey, params.apiKeyId, (k) => k.name || k.clientId),
    },
  });

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
