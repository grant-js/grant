'use client';

import { ComponentProps } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, Building2, Lock, Shield, User, UserCircle } from 'lucide-react';

import { Sidebar } from '@/components/ui/sidebar';

import { DashboardSidebar, NavGroup } from './dashboard-sidebar';

export function SettingsSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const dashboardT = useTranslations('dashboard.navigation');
  const settingsT = useTranslations('settings.navigation');

  const groups: NavGroup[] = [
    {
      label: dashboardT('settings'),
      items: [
        {
          title: settingsT('account'),
          url: '/dashboard/settings/account',
          icon: Building2,
        },
        {
          title: settingsT('profile'),
          url: '/dashboard/settings/profile',
          icon: User,
        },
        {
          title: settingsT('security'),
          url: '/dashboard/settings/security',
          icon: Lock,
        },
        {
          title: settingsT('preferences'),
          url: '/dashboard/settings/preferences',
          icon: UserCircle,
        },
        {
          title: settingsT('notifications'),
          url: '/dashboard/settings/notifications',
          icon: Bell,
        },
        {
          title: settingsT('privacy'),
          url: '/dashboard/settings/privacy',
          icon: Shield,
        },
      ],
      checkActive: true,
    },
  ];

  return <DashboardSidebar groups={groups} {...props} />;
}
