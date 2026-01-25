'use client';

import { useRouter } from 'next/navigation';

import {
  Building2,
  ChevronsUpDown,
  Lock,
  LogOut,
  Mail,
  Shield,
  User,
  UserCircle,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import {
  Avatar,
  SidebarDropdownMenu,
  SidebarDropdownMenuContent,
  SidebarDropdownMenuGroup,
  SidebarDropdownMenuItem,
  SidebarDropdownMenuLabel,
  SidebarDropdownMenuSeparator,
  SidebarDropdownMenuTrigger,
} from '@/components/common';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useMyMutations } from '@/hooks';
import { Link } from '@/i18n/navigation';
import { getInitials } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

export function SidebarAccountDropdown() {
  const t = useTranslations('common');
  const dashboardT = useTranslations('dashboard.navigation');
  const settingsT = useTranslations('settings.navigation');
  const locale = useLocale();
  const router = useRouter();
  const { getCurrentAccount, email, isAuthenticated, clearAuth } = useAuthStore();
  const { logoutMyUser } = useMyMutations();
  const currentAccount = getCurrentAccount();

  if (!isAuthenticated()) {
    return null;
  }

  const handleLogout = async () => {
    await logoutMyUser();
    clearAuth();
    router.push(`/${locale}/auth/login`);
  };

  const userDisplayName = currentAccount?.owner?.name || email || 'User';
  const userPictureUrl = currentAccount?.owner?.pictureUrl;
  const userUpdatedAt = currentAccount?.owner?.updatedAt;
  const initials = getInitials(userDisplayName);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarDropdownMenu>
          <SidebarDropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="!px-1 h-12 w-full">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-accent overflow-hidden">
                <Avatar
                  initial={initials}
                  imageUrl={userPictureUrl ?? undefined}
                  cacheBuster={userUpdatedAt}
                  size="sm"
                  shape="squircle"
                  className="size-8"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">{userDisplayName}</span>
                {email && <span className="truncate text-xs">{email}</span>}
              </div>
              <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </SidebarDropdownMenuTrigger>
          <SidebarDropdownMenuContent align="end" className="min-w-64">
            {/* User Info Section */}
            <SidebarDropdownMenuGroup>
              <SidebarDropdownMenuLabel className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Avatar
                    initial={initials}
                    imageUrl={userPictureUrl ?? undefined}
                    cacheBuster={userUpdatedAt}
                    size="lg"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{userDisplayName}</span>
                    {email && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {email}
                      </span>
                    )}
                  </div>
                </div>
              </SidebarDropdownMenuLabel>
            </SidebarDropdownMenuGroup>

            <SidebarDropdownMenuSeparator />

            {/* Settings Section */}
            <SidebarDropdownMenuGroup>
              <SidebarDropdownMenuLabel>{dashboardT('settings')}</SidebarDropdownMenuLabel>
              <SidebarDropdownMenuItem asChild>
                <Link href="/dashboard/settings/account" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{settingsT('account')}</span>
                </Link>
              </SidebarDropdownMenuItem>
              <SidebarDropdownMenuItem asChild>
                <Link href="/dashboard/settings/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{settingsT('profile')}</span>
                </Link>
              </SidebarDropdownMenuItem>
              <SidebarDropdownMenuItem asChild>
                <Link href="/dashboard/settings/security" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>{settingsT('security')}</span>
                </Link>
              </SidebarDropdownMenuItem>
              <SidebarDropdownMenuItem asChild>
                <Link href="/dashboard/settings/preferences" className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  <span>{settingsT('preferences')}</span>
                </Link>
              </SidebarDropdownMenuItem>
              <SidebarDropdownMenuItem asChild>
                <Link href="/dashboard/settings/privacy" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>{settingsT('privacy')}</span>
                </Link>
              </SidebarDropdownMenuItem>
            </SidebarDropdownMenuGroup>

            <SidebarDropdownMenuSeparator />

            {/* Logout */}
            <SidebarDropdownMenuGroup>
              <SidebarDropdownMenuItem variant="destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span>{t('auth.logout')}</span>
              </SidebarDropdownMenuItem>
            </SidebarDropdownMenuGroup>
          </SidebarDropdownMenuContent>
        </SidebarDropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
