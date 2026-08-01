'use client';

import { ComponentProps } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  CopyCheck,
  Fingerprint,
  FolderOpen,
  Group,
  KeyRound,
  LayoutGrid,
  Package,
  Shield,
  Tag,
  Users,
  Webhook,
} from 'lucide-react';

import { WorkspaceSwitcher } from '@/components/common';
import { ProjectSyncJobsModuleIcon } from '@/components/features/project-sync-jobs/project-sync-jobs-icon';
import { ProjectSwitcher } from '@/components/features/projects';
import { Sidebar } from '@/components/ui/sidebar';

import { DashboardSidebar, NavGroup } from './dashboard-sidebar';

export function PersonalProjectSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const t = useTranslations('dashboard.navigation');
  const params = useParams();
  const accountId = params.accountId as string;
  const projectId = params.projectId as string;

  const groups: NavGroup[] = [
    {
      label: t('workspace'),
      items: [
        {
          title: t('projects'),
          url: `/dashboard/accounts/${accountId}/projects`,
          icon: FolderOpen,
        },
        {
          title: t('accountTags'),
          url: `/dashboard/accounts/${accountId}/tags`,
          icon: Tag,
        },
      ],
    },
    {
      label: t('project'),
      items: [
        {
          title: t('users'),
          url: `/dashboard/accounts/${accountId}/projects/${projectId}/users`,
          icon: Users,
        },
        {
          title: t('apiKeys'),
          url: `/dashboard/accounts/${accountId}/projects/${projectId}/api-keys`,
          icon: KeyRound,
        },
        {
          title: t('signingKeys'),
          url: `/dashboard/accounts/${accountId}/projects/${projectId}/signing-keys`,
          icon: Fingerprint,
        },
        {
          title: t('projectApps'),
          url: `/dashboard/accounts/${accountId}/projects/${projectId}/apps`,
          icon: LayoutGrid,
        },
        {
          title: t('roles'),
          url: `/dashboard/accounts/${accountId}/projects/${projectId}/roles`,
          icon: Shield,
        },
        {
          title: t('groups'),
          url: `/dashboard/accounts/${accountId}/projects/${projectId}/groups`,
          icon: Group,
        },
        {
          title: t('permissions'),
          url: `/dashboard/accounts/${accountId}/projects/${projectId}/permissions`,
          icon: CopyCheck,
        },
        {
          title: t('resources'),
          url: `/dashboard/accounts/${accountId}/projects/${projectId}/resources`,
          icon: Package,
        },
        {
          title: t('projectTags'),
          url: `/dashboard/accounts/${accountId}/projects/${projectId}/tags`,
          icon: Tag,
        },
        {
          title: t('projectSyncJobs'),
          url: `/dashboard/accounts/${accountId}/projects/${projectId}/import-export`,
          icon: ProjectSyncJobsModuleIcon,
        },
        {
          title: t('webhooks'),
          url: `/dashboard/accounts/${accountId}/projects/${projectId}/webhooks`,
          icon: Webhook,
        },
      ],
      checkActive: true,
    },
  ];

  return (
    <DashboardSidebar
      headerContent={
        <>
          <WorkspaceSwitcher />
          <ProjectSwitcher />
        </>
      }
      groups={groups}
      {...props}
    />
  );
}
