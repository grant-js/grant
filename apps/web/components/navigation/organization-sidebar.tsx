'use client';

import { ComponentProps } from 'react';

import { useParams } from 'next/navigation';

import { Building2, FolderOpen, Tag, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { WorkspaceSwitcher } from '@/components/common';
import { OrganizationSwitcher } from '@/components/features/organizations';
import { Sidebar } from '@/components/ui/sidebar';

import { DashboardSidebar, NavGroup } from './dashboard-sidebar';

export function OrganizationSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const t = useTranslations('dashboard.navigation');
  const params = useParams();
  const organizationId = params.organizationId as string;

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
      checkActive: true,
    },
  ];

  return (
    <DashboardSidebar
      headerContent={
        <>
          <WorkspaceSwitcher />
          <OrganizationSwitcher />
        </>
      }
      groups={groups}
      {...props}
    />
  );
}
