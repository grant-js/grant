'use client';

import { ComponentProps } from 'react';

import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { WorkspaceSwitcher } from '@/components/common';
import { Sidebar } from '@/components/ui/sidebar';

import { DashboardSidebar, NavGroup } from './dashboard-sidebar';

export function OrganizationWorkspaceSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const t = useTranslations('dashboard.navigation');

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
      checkActive: true,
    },
  ];

  return <DashboardSidebar headerContent={<WorkspaceSwitcher />} groups={groups} {...props} />;
}
