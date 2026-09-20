'use client';

import { useTranslations } from 'next-intl';
import { ProjectOAuthConnectionProvider } from '@grantjs/schema';
import { Settings } from 'lucide-react';
import { Control, FieldPathByValue, FieldValues } from 'react-hook-form';

import {
  SWITCH_FIELD_ROW_CLASS,
  SWITCH_FIELD_ROW_LABEL_CLASS,
} from '@/components/common/switch-field-row';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  TranslatedFormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const SOCIAL_PROVIDER_IDS = new Set<string>([
  ProjectOAuthConnectionProvider.Github,
  ProjectOAuthConnectionProvider.Google,
]);

interface OAuthProviderOption {
  id: string;
  name: string;
}

interface ProjectAppEnabledProvidersFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPathByValue<TFieldValues, string[] | undefined>;
  label: string;
  items: OAuthProviderOption[];
  emptyText: string;
  disabled?: boolean;
  connectionHrefByProvider?: Partial<Record<string, string>>;
  configuredProviders?: ReadonlySet<string>;
}

export function ProjectAppEnabledProvidersField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  items,
  emptyText,
  disabled = false,
  connectionHrefByProvider,
  configuredProviders,
}: ProjectAppEnabledProvidersFieldProps<TFieldValues>) {
  const tOauth = useTranslations('projectApp.oauth');

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedValues: string[] = Array.isArray(field.value) ? field.value : [];

        return (
          <FormItem className="space-y-3">
            <FormLabel>{label}</FormLabel>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{emptyText}</p>
            ) : (
              <div className="space-y-2">
                {items.map((provider) => {
                  const isEnabled = selectedValues.includes(provider.id);
                  const connectionHref = SOCIAL_PROVIDER_IDS.has(provider.id)
                    ? connectionHrefByProvider?.[provider.id]
                    : undefined;
                  const isProjectConnectionConfigured =
                    configuredProviders?.has(provider.id) ?? false;

                  return (
                    <div key={provider.id} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <FormItem className={cn(SWITCH_FIELD_ROW_CLASS, 'min-w-0 flex-1')}>
                          <FormLabel className={SWITCH_FIELD_ROW_LABEL_CLASS}>
                            {provider.name}
                          </FormLabel>
                          <FormControl>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => {
                                if (disabled) return;
                                field.onChange(
                                  checked
                                    ? [...selectedValues, provider.id]
                                    : selectedValues.filter((value) => value !== provider.id)
                                );
                              }}
                              disabled={disabled}
                            />
                          </FormControl>
                        </FormItem>
                        {connectionHref ? (
                          <Button variant="outline" size="icon" asChild>
                            <Link
                              href={connectionHref}
                              aria-label={tOauth('configureConnectionAria', {
                                provider: provider.name,
                              })}
                            >
                              <Settings className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                      {connectionHref && !isProjectConnectionConfigured ? (
                        <p className="text-sm text-muted-foreground">
                          {tOauth('usingPlatformCredentials')}{' '}
                          <Link
                            href={connectionHref}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {tOauth('configureConnection')}
                          </Link>
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            <TranslatedFormMessage />
          </FormItem>
        );
      }}
    />
  );
}
