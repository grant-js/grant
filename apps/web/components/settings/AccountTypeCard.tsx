'use client';

import { useState } from 'react';

import { AccountType } from '@logusgraphics/grant-schema';
import { Building2, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SettingsCard } from '@/components/settings/SettingsCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCreateComplementaryAccount } from '@/hooks/accounts';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

interface AccountTypeCardProps {
  accountType: 'personal' | 'organization';
  hasComplementaryAccount: boolean;
  accountCount: number;
}

export function AccountTypeCard({
  accountType,
  hasComplementaryAccount,
  accountCount,
}: AccountTypeCardProps) {
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

  return (
    <SettingsCard title={t('type.title')} description={t('type.description')}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t('type.current')}</p>
            <p className="text-sm text-muted-foreground">{t('type.currentDescription')}</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {tCommon(accountType)}
          </Badge>
        </div>

        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="mb-2 text-sm font-semibold">{t(`type.features.${accountType}.title`)}</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• {t(`type.features.${accountType}.feature1`)}</li>
            <li>• {t(`type.features.${accountType}.feature2`)}</li>
            <li>• {t(`type.features.${accountType}.feature3`)}</li>
          </ul>
        </div>

        {canCreateComplementary && (
          <div className="rounded-lg border border-dashed p-4">
            <h4 className="mb-2 text-sm font-semibold">{t('type.complementary.title')}</h4>
            <p className="mb-3 text-sm text-muted-foreground">
              {t('type.complementary.description', {
                type: tCommon(
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

        {accounts.length > 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{t('type.switchAccount')}</p>
            <div className="flex flex-col gap-2">
              {accounts.map((account) => {
                const isSelected = account.id === currentAccount?.id;
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => handleAccountSwitch(account.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                      isSelected
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-border bg-background hover:bg-accent/50'
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
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>{t('type.immutable.title')}</strong> {t('type.immutable.description')}
          </p>
        </div>
      </div>
    </SettingsCard>
  );
}
