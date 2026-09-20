'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ProjectOAuthConnection, ProjectOAuthConnectionProvider } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { OAuthProviderIcon } from '@/components/common/oauth-provider-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  TranslatedFormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const providerFormSchema = z.object({
  clientId: z.string().min(1, 'projects.oauthConnections.validation.clientIdRequired'),
  clientSecret: z.string().min(1, 'projects.oauthConnections.validation.clientSecretRequired'),
});

type ProviderFormValues = z.infer<typeof providerFormSchema>;

interface ProjectOAuthConnectionProviderSectionProps {
  provider: ProjectOAuthConnectionProvider;
  connection: ProjectOAuthConnection | undefined;
  disabled: boolean;
  onSave: (values: ProviderFormValues) => Promise<unknown>;
  onClear: () => Promise<unknown>;
}

export function ProjectOAuthConnectionProviderSection({
  provider,
  connection,
  disabled,
  onSave,
  onClear,
}: ProjectOAuthConnectionProviderSectionProps) {
  const t = useTranslations('projects.oauthConnections');
  const tCommon = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const defaultValues = useMemo(
    () => ({
      clientId: connection?.clientId ?? '',
      clientSecret: '',
    }),
    [connection?.clientId]
  );

  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(providerFormSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const isConfigured = connection?.isConfigured ?? false;
  const providerLabel = t(`providers.${provider}`);

  const handleSubmit = async (values: ProviderFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave(values);
      form.reset({ clientId: values.clientId, clientSecret: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await onClear();
      form.reset({ clientId: '', clientSecret: '' });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <OAuthProviderIcon provider={provider} />
          <h3 className="font-medium">{providerLabel}</h3>
        </div>
        {isConfigured ? (
          <Badge variant="secondary">{t('configuredBadge')}</Badge>
        ) : (
          <Badge variant="outline">{t('notConfiguredBadge')}</Badge>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clientId')}</FormLabel>
                <FormControl>
                  <Input {...field} disabled={disabled} autoComplete="off" />
                </FormControl>
                <TranslatedFormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="clientSecret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clientSecret')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    disabled={disabled}
                    autoComplete="new-password"
                    placeholder={isConfigured ? t('clientSecretConfiguredPlaceholder') : undefined}
                  />
                </FormControl>
                <FormDescription>{t('clientSecretHint')}</FormDescription>
                <TranslatedFormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-wrap justify-end gap-2">
            {isConfigured && (
              <Button
                type="button"
                variant="outline"
                disabled={disabled || isSubmitting || isClearing}
                onClick={handleClear}
              >
                {isClearing ? t('clearingConnection') : t('clearConnection')}
              </Button>
            )}
            <Button type="submit" disabled={disabled || !form.formState.isDirty || isSubmitting}>
              {isSubmitting ? tCommon('actions.saving') : tCommon('actions.save')}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
