'use client';

import { ComponentProps } from 'react';

import { useParams } from 'next/navigation';

import { Fingerprint, FolderOpen, Group, Key, Package, Shield, Tag, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { WorkspaceSwitcher } from '@/components/common';
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
          icon: Fingerprint,
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
          icon: Key,
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
