'use client';

import { ComponentProps } from 'react';

import { useParams } from 'next/navigation';

import { FolderOpen, Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { WorkspaceSwitcher } from '@/components/common';
import { Sidebar } from '@/components/ui/sidebar';

import { DashboardSidebar, NavGroup } from './dashboard-sidebar';

export function PersonalWorkspaceSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const t = useTranslations('dashboard.navigation');
  const params = useParams();
  const accountId = params.accountId as string;

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
      checkActive: true,
    },
  ];

  return <DashboardSidebar headerContent={<WorkspaceSwitcher />} groups={groups} {...props} />;
}
