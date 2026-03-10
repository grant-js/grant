'use client';

import { useCallback, useMemo, useState } from 'react';

import { AccountType } from '@grantjs/schema';
import { Building2, Check, Layers, PlusCircle, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SidebarPopover } from '@/components/common';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useMyMutations } from '@/hooks/me/use-my-mutations';
import { usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

interface WorkspaceSwitcherProps {
  className?: string;
}

export function WorkspaceSwitcher({ className }: WorkspaceSwitcherProps) {
  const t = useTranslations('common');
  const tSettings = useTranslations('settings');
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isCreatingComplementary, setIsCreatingComplementary] = useState(false);

  const { accounts, setCurrentAccount, setSwitchingAccounts, getCurrentAccount } = useAuthStore();
  const { createMySecondaryAccount } = useMyMutations();
  const currentAccount = getCurrentAccount();

  const hasPersonal = useMemo(
    () => accounts.some((a) => a.type === AccountType.Personal),
    [accounts]
  );
  const hasOrganization = useMemo(
    () => accounts.some((a) => a.type === AccountType.Organization),
    [accounts]
  );
  const showCreateComplementary = !(hasPersonal && hasOrganization);
  const complementaryTypeLabel = hasPersonal
    ? t('accountTypes.organization')
    : t('accountTypes.personal');

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
    const activeAccount = currentAccount ?? accounts[0] ?? null;
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
  }, [currentAccount, accounts, t]);

  const handleWorkspaceSelect = useCallback(
    (workspaceId: string, workspaceType: AccountType) => {
      setOpen(false);

      const newPath =
        workspaceType === AccountType.Organization
          ? '/dashboard/organizations'
          : `/dashboard/accounts/${workspaceId}/projects`;

      const shouldNavigate =
        workspaceType === AccountType.Organization
          ? !pathname.startsWith('/dashboard/organizations')
          : !pathname.startsWith(`/dashboard/accounts/${workspaceId}`);

      setSwitchingAccounts(true);
      setCurrentAccount(workspaceId);

      if (shouldNavigate) {
        queueMicrotask(() => {
          router.push(newPath);
        });
      } else {
        setSwitchingAccounts(false);
      }
    },
    [pathname, router, setCurrentAccount, setSwitchingAccounts]
  );

  const workspaceName = currentWorkspace ? currentWorkspace.name : t('account.workspace');

  const handleCreateComplementary = useCallback(async () => {
    setOpen(false);
    setIsCreatingComplementary(true);
    try {
      await createMySecondaryAccount();
    } finally {
      setIsCreatingComplementary(false);
    }
  }, [createMySecondaryAccount]);

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
        {showCreateComplementary && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="create-complementary"
                onSelect={handleCreateComplementary}
                disabled={isCreatingComplementary}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                {tSettings('account.type.complementary.action', { type: complementaryTypeLabel })}
              </CommandItem>
            </CommandGroup>
          </>
        )}
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
