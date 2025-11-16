'use client';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { AccountType } from '@logusgraphics/grant-schema';
import { Building2, Info, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { CreateComplementaryAccountDialog } from '@/components/settings/CreateComplementaryAccountDialog';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUsernameValidation } from '@/hooks/accounts';
import { AccountSettingsFormValues, accountSettingsSchema } from '@/lib/schemas/settings';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

interface AccountDetailsCardProps {
  accountType: 'personal' | 'organization';
  hasComplementaryAccount: boolean;
  accountCount: number;
  defaultValues: AccountSettingsFormValues;
  accountId: string;
  onSubmit: (values: AccountSettingsFormValues) => Promise<void>;
}

export function AccountDetailsCard({
  accountType,
  hasComplementaryAccount,
  accountCount,
  defaultValues,
  accountId,
  onSubmit,
}: AccountDetailsCardProps) {
  const t = useTranslations('settings.account');
  const tCommon = useTranslations('common');
  const tAccountTypes = useTranslations('common.accountTypes');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { accounts, currentAccount, setCurrentAccount } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    isChecking,
    isAvailable,
    checkUsername,
    reset: resetUsernameValidation,
  } = useUsernameValidation();

  const complementaryType =
    accountType === 'personal' ? AccountType.Organization : AccountType.Personal;
  const canCreateComplementary = accountCount < 2 && !hasComplementaryAccount;

  const form = useForm<AccountSettingsFormValues>({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues,
  });

  const currentUsername = form.watch('slug');

  // Reset form when account changes (account switch)
  useEffect(() => {
    if (accountId) {
      form.reset(defaultValues);
      resetUsernameValidation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  // Revalidate form when username availability changes
  useEffect(() => {
    if (currentUsername && currentUsername !== defaultValues.slug && isAvailable !== null) {
      form.trigger('slug');
    }
  }, [isAvailable, currentUsername, defaultValues.slug, form]);

  const handleAccountSwitch = (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    if (account) {
      setCurrentAccount(account);
    }
  };

  const handleUsernameChange = (value: string) => {
    form.setValue('slug', value, { shouldDirty: true, shouldValidate: true });

    if (value && value.trim().length >= 3 && value !== defaultValues.slug) {
      checkUsername(value);
    }
  };

  const handleSubmit = async (values: AccountSettingsFormValues) => {
    if (
      values.slug &&
      values.slug !== defaultValues.slug &&
      values.slug.length >= 3 &&
      isAvailable === false
    ) {
      form.setError('slug', {
        type: 'manual',
        message: t('information.fields.username.unavailable'),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardTitle = accountCount > 1 ? t('details.titlePlural') : t('details.title');

  return (
    <>
      <SettingsCard
        title={cardTitle}
        description={t('details.description')}
        footer={
          <div className="flex justify-end gap-4 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset(defaultValues)}
              disabled={!form.formState.isDirty || isSubmitting}
            >
              {tCommon('actions.cancel')}
            </Button>
            <Button
              type="submit"
              form="account-details-form"
              disabled={!form.formState.isDirty || isSubmitting}
            >
              {isSubmitting ? tCommon('actions.saving') : tCommon('actions.save')}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Account Switcher (if multiple accounts) */}
          {accounts.length > 1 && (
            <>
              <p className="text-sm font-medium">{t('type.currentAccount')}</p>
              <div className="flex flex-col gap-2">
                {accounts.map((account) => {
                  const isSelected = account.id === currentAccount?.id;
                  const accountTypeKey =
                    account.type === AccountType.Organization ? 'organization' : 'personal';
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
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                        )}
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
                          {account.slug && (
                            <span className="text-xs text-muted-foreground truncate">
                              @{account.slug}
                            </span>
                          )}
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
                          <TooltipContent
                            side="right"
                            className="max-w-xs px-4 py-3"
                            sideOffset={8}
                          >
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
            </>
          )}

          {/* Account Information Form */}
          <div className="space-y-6 pt-4 border-t">
            <div>
              <h4 className="text-sm font-semibold mb-1">{t('information.title')}</h4>
              <p className="text-sm text-muted-foreground">{t('information.description')}</p>
            </div>

            <Form {...form}>
              <form
                id="account-details-form"
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('information.fields.name.label')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('information.fields.name.placeholder')}
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>{t('information.fields.name.description')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('information.fields.username.label')}</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input
                            placeholder={t('information.fields.username.placeholder')}
                            {...field}
                            onChange={(e) => handleUsernameChange(e.target.value)}
                            disabled={isSubmitting}
                          />
                          {isChecking && field.value !== defaultValues.slug && (
                            <p className="text-sm text-muted-foreground">
                              {t('information.fields.username.checking')}
                            </p>
                          )}
                          {isAvailable === true && field.value !== defaultValues.slug && (
                            <p className="text-sm text-green-600 dark:text-green-400">
                              {t('information.fields.username.available')}
                            </p>
                          )}
                          {isAvailable === false && field.value !== defaultValues.slug && (
                            <p className="text-sm text-destructive">
                              {t('information.fields.username.unavailable')}
                            </p>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        {t('information.fields.username.description')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
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
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                {t('type.complementary.action', {
                  type: tAccountTypes(
                    complementaryType === AccountType.Organization ? 'organization' : 'personal'
                  ),
                })}
              </Button>
            </div>
          )}
        </div>
      </SettingsCard>

      <CreateComplementaryAccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        complementaryType={complementaryType}
      />
    </>
  );
}
