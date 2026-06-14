'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ProjectApp } from '@grantjs/schema';
import { useFormContext } from 'react-hook-form';

import { FeatureModuleCard } from '@/components/common';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { ProjectAppTestFormValues } from './project-app-test-types';

interface ProjectAppTestOauthCardProps {
  projectApp: ProjectApp;
}

export function ProjectAppTestOauthCard({ projectApp }: ProjectAppTestOauthCardProps) {
  const t = useTranslations('projectApp.test');
  const form = useFormContext<ProjectAppTestFormValues>();

  const redirectUris = useMemo(() => projectApp.redirectUris ?? [], [projectApp.redirectUris]);
  const redirectUriOptions = useMemo(
    () => redirectUris.map((uri) => ({ value: uri, label: uri })),
    [redirectUris]
  );

  return (
    <FeatureModuleCard
      title={t('configuration.title')}
      description={t('configuration.description')}
      collapsible
    >
      <FormField
        control={form.control}
        name="redirectUri"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('redirectUri')}</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} required>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('redirectUriPlaceholder')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {redirectUriOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
    </FeatureModuleCard>
  );
}
