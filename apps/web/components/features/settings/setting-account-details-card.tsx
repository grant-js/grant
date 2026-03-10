'use client';

import { useState } from 'react';

import { AccountType } from '@grantjs/schema';
import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  UserCog,
  Users,
  UserX,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CopyToClipboard } from '@/components/common';
import { SettingCard } from '@/components/features/settings';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import { useEmailVerified } from '@/hooks/auth';
import { useMyMutations } from '@/hooks/me';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

import { SettingAccountDetailsCardProps } from './setting-types';

import type { LucideIcon } from 'lucide-react';

const VISIBLE_FEATURE_COUNT = 3;
const TOTAL_FEATURE_KEYS = ['feature1', 'feature2', 'feature3', 'feature4', 'feature5'] as const;

const FEATURE_ICONS: Record<
  'personal' | 'organization',
  Record<(typeof TOTAL_FEATURE_KEYS)[number], LucideIcon>
> = {
  personal: {
    feature1: User,
    feature2: Shield,
    feature3: UserX,
    feature4: FolderKanban,
    feature5: Sparkles,
  },
  organization: {
    feature1: Users,
    feature2: ShieldCheck,
    feature3: Building2,
    feature4: UserCog,
    feature5: Briefcase,
  },
};

export function SettingAccountDetailsCard({
  accountType,
  hasComplementaryAccount,
  accountCount,
}: SettingAccountDetailsCardProps) {
  const t = useTranslations('settings.account');
  const tCommon = useTranslations('common');
  const tAccountTypes = useTranslations('common.accountTypes');
  const [isCreating, setIsCreating] = useState(false);
  const [expandedFeaturesByAccountId, setExpandedFeaturesByAccountId] = useState<
    Record<string, boolean>
  >({});
  const { accounts } = useAuthStore();
  const { createMySecondaryAccount } = useMyMutations();
  const isEmailVerified = useEmailVerified();

  const complementaryType =
    accountType === 'personal' ? AccountType.Organization : AccountType.Personal;
  const canCreateComplementary = accountCount < 2 && !hasComplementaryAccount;

  const handleCreateComplementary = async () => {
    setIsCreating(true);
    try {
      await createMySecondaryAccount();
    } finally {
      setIsCreating(false);
    }
  };

  const cardTitle = accountCount > 1 ? t('details.titlePlural') : t('details.title');

  return (
    <>
      <SettingCard title={cardTitle} description={t('details.description')}>
        <div className="space-y-6">
          {/* Account list with expanded type info and ID */}
          <div className="flex flex-col gap-4">
            {accounts.map((account) => {
              const accountTypeKey =
                account.type === AccountType.Organization ? 'organization' : 'personal';
              return (
                <div
                  key={account.id}
                  className="rounded-lg border border-border bg-background p-4 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    {account.type === AccountType.Organization ? (
                      <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    ) : (
                      <User className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">
                      {account.type === AccountType.Organization
                        ? tAccountTypes('organization')
                        : tAccountTypes('personal')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('details.idLabel')}</Label>
                    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                      <code className="flex-1 min-w-0 truncate text-sm font-mono">
                        {account.id}
                      </code>
                      <CopyToClipboard text={account.id} size="sm" variant="ghost" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      {t('type.features.title')}
                    </p>
                    <ItemGroup className="gap-4">
                      {TOTAL_FEATURE_KEYS.slice(0, VISIBLE_FEATURE_COUNT).map((key) => {
                        const Icon = FEATURE_ICONS[accountTypeKey][key];
                        return (
                          <Item key={key} variant="default" size="sm">
                            <ItemMedia variant="icon">
                              <Icon className="size-4 text-muted-foreground" />
                            </ItemMedia>
                            <ItemContent>
                              <ItemTitle>
                                {t(`type.features.${accountTypeKey}.${key}Title`)}
                              </ItemTitle>
                              <ItemDescription>
                                {t(`type.features.${accountTypeKey}.${key}Description`)}
                              </ItemDescription>
                            </ItemContent>
                          </Item>
                        );
                      })}
                    </ItemGroup>
                    {TOTAL_FEATURE_KEYS.length > VISIBLE_FEATURE_COUNT && (
                      <Collapsible
                        open={expandedFeaturesByAccountId[account.id] ?? false}
                        onOpenChange={(open) =>
                          setExpandedFeaturesByAccountId((prev) => ({
                            ...prev,
                            [account.id]: open,
                          }))
                        }
                      >
                        <CollapsibleContent asChild>
                          <ItemGroup className="mt-1 gap-4">
                            {TOTAL_FEATURE_KEYS.slice(VISIBLE_FEATURE_COUNT).map((key) => {
                              const Icon = FEATURE_ICONS[accountTypeKey][key];
                              return (
                                <Item key={key} variant="default" size="sm">
                                  <ItemMedia variant="icon">
                                    <Icon className="size-4 text-muted-foreground" />
                                  </ItemMedia>
                                  <ItemContent>
                                    <ItemTitle>
                                      {t(`type.features.${accountTypeKey}.${key}Title`)}
                                    </ItemTitle>
                                    <ItemDescription>
                                      {t(`type.features.${accountTypeKey}.${key}Description`)}
                                    </ItemDescription>
                                  </ItemContent>
                                </Item>
                              );
                            })}
                          </ItemGroup>
                        </CollapsibleContent>
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              'inline-flex items-center gap-1 text-sm font-medium text-primary',
                              'hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded mt-1'
                            )}
                          >
                            {expandedFeaturesByAccountId[account.id] ? (
                              <>
                                {t('type.showLess')}
                                <ChevronUp className="h-4 w-4 shrink-0" />
                              </>
                            ) : (
                              <>
                                {t('type.showMore')}
                                <ChevronDown className="h-4 w-4 shrink-0" />
                              </>
                            )}
                          </button>
                        </CollapsibleTrigger>
                      </Collapsible>
                    )}
                  </div>
                </div>
              );
            })}
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
                disabled={isCreating || !isEmailVerified}
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
      </SettingCard>
    </>
  );
}
