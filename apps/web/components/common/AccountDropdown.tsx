'use client';

import { useRouter } from 'next/navigation';

import { AccountType } from '@logusgraphics/grant-schema';
import { Building2, Check, LogOut, Mail, Settings, User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth.store';

export function AccountDropdown() {
  const t = useTranslations('common');
  const dashboardT = useTranslations('dashboard.navigation');
  const locale = useLocale();
  const router = useRouter();
  const { currentAccount, accounts, email, isAuthenticated, switchAccount, clearAuth } =
    useAuthStore();

  if (!isAuthenticated()) {
    return null;
  }

  const handleLogout = () => {
    clearAuth();
    router.push(`/${locale}/auth/login`);
  };

  const handleAccountSwitch = (accountId: string) => {
    switchAccount(accountId);
    // Optionally redirect based on account type
    const account = accounts.find((acc) => acc.id === accountId);
    if (account) {
      if (account.type === AccountType.Organization) {
        router.push(`/${locale}/dashboard/organizations`);
      } else {
        router.push(`/${locale}/dashboard`);
      }
    }
  };

  const displayName = currentAccount?.name || email || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 w-9 rounded-full p-0 bg-primary/10 hover:bg-primary/20 focus-visible:bg-primary/20 transition-colors font-medium text-primary border-border"
        >
          {initials}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* User Info Section */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Avatar initial={initials} size="lg" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{displayName}</span>
                {email && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {email}
                  </span>
                )}
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Account Switcher */}
        {accounts.length > 1 && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t('account.switchAccount')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={currentAccount?.id}
                onValueChange={handleAccountSwitch}
              >
                {accounts.map((account) => (
                  <DropdownMenuRadioItem
                    key={account.id}
                    value={account.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {account.type === AccountType.Organization ? (
                        <Building2 className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      <span className="text-sm">
                        {account.type === AccountType.Organization
                          ? t('accountTypes.organization')
                          : t('accountTypes.personal')}
                      </span>
                    </div>
                    {account.id === currentAccount?.id && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Accounts List (if single account or for reference) */}
        {accounts.length === 1 && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t('account.currentAccount')}</DropdownMenuLabel>
              <DropdownMenuItem disabled className="flex items-center gap-2">
                {currentAccount?.type === AccountType.Organization ? (
                  <Building2 className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span className="text-sm">
                  {currentAccount?.type === AccountType.Organization
                    ? t('accountTypes.organization')
                    : t('accountTypes.personal')}
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Settings */}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
              <Settings className="h-4 w-4" />
              <span>{dashboardT('settings')}</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span>{t('auth.logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
