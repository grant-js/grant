'use client';

import { useMemo, useState } from 'react';

import { redirect, useParams } from 'next/navigation';

import { AccountType } from '@grantjs/schema';
import { Building2, Check, Layers, User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { SidebarPopover } from '@/components/common';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

interface WorkspaceSwitcherProps {
  className?: string;
}

export function WorkspaceSwitcher({ className }: WorkspaceSwitcherProps) {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const [open, setOpen] = useState(false);

  const { accounts, switchAccount } = useAuthStore();

  const isOrganizationWorkspace = pathname.includes('/dashboard/organizations');
  const isAccountWorkspace = pathname.includes('/dashboard/accounts');
  const accountId = params.accountId as string | undefined;

  const workspaces = useMemo(() => {
    return accounts.map((account) => ({
      id: account.id,
      name:
        account.type === AccountType.Personal
          ? t('accountTypes.personal')
          : t('accountTypes.organization'),
      type: account.type,
      icon: account.type === AccountType.Organization ? Building2 : User,
    }));
  }, [accounts, t]);

  const currentWorkspace = useMemo(() => {
    let activeAccount = null;

    if (isAccountWorkspace && accountId) {
      activeAccount = accounts.find((account) => account.id === accountId);
    } else if (isOrganizationWorkspace) {
      activeAccount = accounts.find((account) => account.type === AccountType.Organization);
    }

    if (!activeAccount && accounts.length > 0) {
      activeAccount = accounts[0];
    }

    if (!activeAccount) return null;

    return {
      id: activeAccount.id,
      name:
        activeAccount.type === AccountType.Personal
          ? t('accountTypes.personal')
          : t('accountTypes.organization'),
      type: activeAccount.type,
      icon: activeAccount.type === AccountType.Organization ? Building2 : User,
    };
  }, [isOrganizationWorkspace, isAccountWorkspace, accountId, accounts, t]);

  const handleWorkspaceSelect = (workspaceId: string, workspaceType: AccountType) => {
    setOpen(false);

    switchAccount(workspaceId);

    if (workspaceType === AccountType.Organization) {
      const newPath = `/${locale}/dashboard/organizations`;
      if (pathname !== newPath && !pathname.startsWith(`/${locale}/dashboard/organizations`)) {
        redirect(newPath);
      }
    } else {
      const newPath = `/${locale}/dashboard/accounts/${workspaceId}/projects`;
      if (
        pathname !== newPath &&
        !pathname.startsWith(`/${locale}/dashboard/accounts/${workspaceId}`)
      ) {
        redirect(newPath);
      }
    }
  };

  const workspaceName = currentWorkspace ? currentWorkspace.name : t('account.workspace');

  const popoverContent = (
    <Command>
      <CommandList>
        <CommandGroup>
          {workspaces.map((workspace) => (
            <CommandItem
              key={workspace.id}
              value={workspace.name}
              onSelect={() => handleWorkspaceSelect(workspace.id, workspace.type)}
            >
              <Check
                className={cn(
                  'mr-2 h-4 w-4',
                  currentWorkspace?.id === workspace.id ? 'opacity-100' : 'opacity-0'
                )}
              />
              {workspace.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  return (
    <SidebarPopover
      icon={<Layers />}
      title={workspaceName}
      label={t('account.workspace')}
      content={popoverContent}
      buttonProps={{
        size: 'lg',
        className: cn('!px-1 h-12', className),
        disabled: workspaces.length === 0,
      }}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
