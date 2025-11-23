'use client';

import { AccountType } from '@logusgraphics/grant-schema';
import { Building2, Check, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SettingsCard } from '@/components/settings/SettingsCard';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';

export function AccountSelectionCard() {
  const t = useTranslations('settings.account');
  const tAccountTypes = useTranslations('common.accountTypes');
  const { accounts, currentAccount, setCurrentAccount } = useAuthStore();

  if (accounts.length <= 1) {
    return null;
  }

  const handleAccountSwitch = (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    if (account) {
      setCurrentAccount(account);
    }
  };

  return (
    <SettingsCard title={t('selection.title')} description={t('selection.description')}>
      <div className="space-y-2">
        {accounts.map((account) => {
          const isCurrent = account.id === currentAccount?.id;
          return (
            <Button
              key={account.id}
              variant={isCurrent ? 'default' : 'outline'}
              className="w-full justify-start h-auto py-3"
              onClick={() => handleAccountSwitch(account.id)}
            >
              <div className="flex items-center gap-3 w-full">
                {account.type === AccountType.Organization ? (
                  <Building2 className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <User className="h-5 w-5 flex-shrink-0" />
                )}
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="text-sm font-medium">
                    {account.type === AccountType.Organization
                      ? tAccountTypes('organization')
                      : tAccountTypes('personal')}
                  </span>
                  {account.slug && (
                    <span className="text-xs text-muted-foreground truncate w-full">
                      @{account.slug}
                    </span>
                  )}
                </div>
                {isCurrent && <Check className="h-4 w-4 ml-auto flex-shrink-0" />}
              </div>
            </Button>
          );
        })}
      </div>
    </SettingsCard>
  );
}
