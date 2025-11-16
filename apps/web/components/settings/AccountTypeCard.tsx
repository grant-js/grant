'use client';

import { useTranslations } from 'next-intl';

import { SettingsCard } from '@/components/settings/SettingsCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AccountTypeCardProps {
  accountType: 'personal' | 'organization';
  hasComplementaryAccount: boolean;
  onCreateComplementaryAccount?: () => void;
}

export function AccountTypeCard({
  accountType,
  hasComplementaryAccount,
  onCreateComplementaryAccount,
}: AccountTypeCardProps) {
  const t = useTranslations('settings.account');
  const tCommon = useTranslations('common.accountTypes');

  const complementaryType = accountType === 'personal' ? 'organization' : 'personal';

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

        {!hasComplementaryAccount && (
          <div className="rounded-lg border border-dashed p-4">
            <h4 className="mb-2 text-sm font-semibold">{t('type.complementary.title')}</h4>
            <p className="mb-3 text-sm text-muted-foreground">
              {t('type.complementary.description', { type: tCommon(complementaryType) })}
            </p>
            <Button variant="outline" size="sm" onClick={onCreateComplementaryAccount}>
              {t('type.complementary.action', { type: tCommon(complementaryType) })}
            </Button>
          </div>
        )}

        {hasComplementaryAccount && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              {t('type.multipleAccounts.description')}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('type.multipleAccounts.switchInstruction')}
            </p>
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
