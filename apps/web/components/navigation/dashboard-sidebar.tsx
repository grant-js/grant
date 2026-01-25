'use client';

import { ComponentProps, ReactNode, useCallback } from 'react';

import { LucideIcon } from 'lucide-react';

import { SidebarAccountDropdown } from '@/components/common';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { usePathname } from '@/i18n/navigation';

import { NavLink } from './nav-link';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  checkActive?: boolean; // Whether to check and highlight active items
}

interface DashboardSidebarProps extends ComponentProps<typeof Sidebar> {
  headerContent?: ReactNode;
  groups: NavGroup[];
}

export function DashboardSidebar({ headerContent, groups, ...props }: DashboardSidebarProps) {
  const pathname = usePathname();

  const isActive = useCallback(
    (url: string) => {
      return pathname === url || pathname.startsWith(`${url}/`);
    },
    [pathname]
  );

  return (
    <Sidebar
      collapsible="icon"
      className="top-[calc(3.5rem+1px)] h-[calc(100vh-3.5rem-1px)]"
      {...props}
    >
      {headerContent && <SidebarHeader>{headerContent}</SidebarHeader>}
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = group.checkActive ? isActive(item.url) : false;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <NavLink href={item.url} data-active={active ? 'true' : undefined}>
                          <item.icon />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarAccountDropdown />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
