'use client';

import { useState } from 'react';

import { AccountType } from '@logusgraphics/grant-schema';
import { Building2, Info, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SettingsCard } from '@/components/settings/SettingsCard';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCreateComplementaryAccount } from '@/hooks/accounts';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

interface AccountDetailsCardProps {
  accountType: 'personal' | 'organization';
  hasComplementaryAccount: boolean;
  accountCount: number;
}

export function AccountDetailsCard({
  accountType,
  hasComplementaryAccount,
  accountCount,
}: AccountDetailsCardProps) {
  const t = useTranslations('settings.account');
  const tCommon = useTranslations('common');
  const tAccountTypes = useTranslations('common.accountTypes');
  const [isCreating, setIsCreating] = useState(false);
  const { accounts, getCurrentAccount, setCurrentAccount } = useAuthStore();
  const { createComplementaryAccount } = useCreateComplementaryAccount();
  const currentAccount = getCurrentAccount();

  const complementaryType =
    accountType === 'personal' ? AccountType.Organization : AccountType.Personal;
  const canCreateComplementary = accountCount < 2 && !hasComplementaryAccount;

  const handleAccountSwitch = (accountId: string) => {
    setCurrentAccount(accountId);
  };

  const handleCreateComplementary = async () => {
    setIsCreating(true);
    try {
      await createComplementaryAccount();
    } finally {
      setIsCreating(false);
    }
  };

  const cardTitle = accountCount > 1 ? t('details.titlePlural') : t('details.title');

  return (
    <>
      <SettingsCard title={cardTitle} description={t('details.description')}>
        <div className="space-y-6">
          {/* Account Switcher (always shown) */}
          <div>
            <p className="text-sm font-medium">{t('type.currentAccount')}</p>
            <div className="flex flex-col gap-2 mt-2">
              {accounts.map((account) => {
                const isSelected = account.id === currentAccount?.id;
                const accountTypeKey =
                  account.type === AccountType.Organization ? 'organization' : 'personal';
                const isClickable = accounts.length > 1;
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => isClickable && handleAccountSwitch(account.id)}
                    disabled={!isClickable}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                      isSelected
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-border bg-background',
                      isClickable && !isSelected && 'hover:bg-accent/50',
                      !isClickable && 'cursor-default'
                    )}
                  >
                    <div
                      className={cn(
                        'h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/40 bg-background'
                      )}
                    >
                      {isSelected && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {account.type === AccountType.Organization ? (
                        <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      ) : (
                        <User className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      )}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium">
                          {account.type === AccountType.Organization
                            ? tAccountTypes('organization')
                            : tAccountTypes('personal')}
                        </span>
                      </div>
                    </div>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-help"
                          >
                            <Info className="h-4 w-4" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs px-4 py-3" sideOffset={8}>
                          <div className="space-y-2">
                            <p className="font-semibold">
                              {t(`type.features.${accountTypeKey}.title`)}
                            </p>
                            <ul className="space-y-1 text-xs">
                              <li>• {t(`type.features.${accountTypeKey}.feature1`)}</li>
                              <li>• {t(`type.features.${accountTypeKey}.feature2`)}</li>
                              <li>• {t(`type.features.${accountTypeKey}.feature3`)}</li>
                            </ul>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Complementary Account Creation */}
          {canCreateComplementary && (
            <div className="rounded-lg border border-dashed p-4">
              <h4 className="mb-2 text-sm font-semibold">{t('type.complementary.title')}</h4>
              <p className="mb-3 text-sm text-muted-foreground">
                {t('type.complementary.description', {
                  type: tAccountTypes(
                    complementaryType === AccountType.Organization ? 'organization' : 'personal'
                  ),
                })}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateComplementary}
                disabled={isCreating}
              >
                {isCreating
                  ? tCommon('actions.creating')
                  : t('type.complementary.action', {
                      type: tAccountTypes(
                        complementaryType === AccountType.Organization ? 'organization' : 'personal'
                      ),
                    })}
              </Button>
            </div>
          )}
        </div>
      </SettingsCard>
    </>
  );
}
