'use client';

import { ComponentProps } from 'react';

import { useParams } from 'next/navigation';

import { Building2, FolderOpen, Group, Key, Package, Shield, Tag, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { WorkspaceSwitcher } from '@/components/common';
import { OrganizationSwitcher } from '@/components/features/organizations';
import { ProjectSwitcher } from '@/components/features/projects';
import { Sidebar } from '@/components/ui/sidebar';

import { DashboardSidebar, NavGroup } from './dashboard-sidebar';

export function ProjectSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const t = useTranslations('dashboard.navigation');
  const params = useParams();
  const organizationId = params.organizationId as string;
  const projectId = params.projectId as string;

  const groups: NavGroup[] = [
    {
      label: t('workspace'),
      items: [
        {
          title: t('organizations'),
          url: `/dashboard/organizations`,
          icon: Building2,
        },
      ],
    },
    {
      label: t('organization'),
      items: [
        {
          title: t('projects'),
          url: `/dashboard/organizations/${organizationId}/projects`,
          icon: FolderOpen,
        },
        {
          title: t('members'),
          url: `/dashboard/organizations/${organizationId}/members`,
          icon: Users,
        },
        {
          title: t('organizationTags'),
          url: `/dashboard/organizations/${organizationId}/tags`,
          icon: Tag,
        },
      ],
    },
    {
      label: t('project'),
      items: [
        {
          title: t('users'),
          url: `/dashboard/organizations/${organizationId}/projects/${projectId}/users`,
          icon: Users,
        },
        {
          title: t('roles'),
          url: `/dashboard/organizations/${organizationId}/projects/${projectId}/roles`,
          icon: Shield,
        },
        {
          title: t('groups'),
          url: `/dashboard/organizations/${organizationId}/projects/${projectId}/groups`,
          icon: Group,
        },
        {
          title: t('permissions'),
          url: `/dashboard/organizations/${organizationId}/projects/${projectId}/permissions`,
          icon: Key,
        },
        {
          title: t('resources'),
          url: `/dashboard/organizations/${organizationId}/projects/${projectId}/resources`,
          icon: Package,
        },
        {
          title: t('projectTags'),
          url: `/dashboard/organizations/${organizationId}/projects/${projectId}/tags`,
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
          <OrganizationSwitcher />
          <ProjectSwitcher />
        </>
      }
      groups={groups}
      {...props}
    />
  );
}
