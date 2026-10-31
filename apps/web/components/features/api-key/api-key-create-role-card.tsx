'use client';

import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { FeatureModuleCard } from '@/components/common';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  TranslatedFormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApiKeyAttachableGrants } from '@/hooks/api-keys';
import { useScopeFromParams } from '@/hooks/common';

import type { ProjectApiKeyCreateFormValues } from '../api-keys/api-key-types';

/** The standard roles the caller may give a key, as the server computed them. */
export function ApiKeyCreateRoleCard() {
  const t = useTranslations('user.apiKeys.roleCard');
  const tRoot = useTranslations();
  const scope = useScopeFromParams();
  const form = useFormContext<ProjectApiKeyCreateFormValues>();
  const { roles, loading, error } = useApiKeyAttachableGrants(scope);

  return (
    <FeatureModuleCard title={t('title')} description={t('description')} collapsible>
      {error ? (
        <p className="text-sm text-destructive">{t('error')}</p>
      ) : !loading && roles.length === 0 ? (
        <Alert variant="info" className="rounded-lg border-info bg-info/10">
          <AlertDescription>{t('empty')}</AlertDescription>
        </Alert>
      ) : (
        <FormField
          control={form.control}
          name="roleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('label')}</FormLabel>
              <Select
                value={field.value ?? ''}
                onValueChange={field.onChange}
                disabled={loading && roles.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={loading ? t('loading') : t('placeholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {tRoot(role.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TranslatedFormMessage />
            </FormItem>
          )}
        />
      )}
    </FeatureModuleCard>
  );
}
