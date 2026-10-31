'use client';

import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { FeatureModuleCard } from '@/components/common';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ApiKeyGrantKind } from '@/lib/api-key-grants';

import type { ProjectApiKeyCreateFormValues } from '../api-keys/api-key-types';

const OPTIONS: ApiKeyGrantKind[] = ['role', 'scopes'];

const optionClassName =
  'h-auto w-full flex-col items-start gap-1 whitespace-normal px-4 py-3 text-left data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground';

/** The first card of the create view: which authorization model the key carries. No default. */
export function ApiKeyCreateGrantKindCard() {
  const t = useTranslations('user.apiKeys.grantKind');
  const form = useFormContext<ProjectApiKeyCreateFormValues>();
  const grantKind = form.watch('grantKind');

  const handleChange = (next: string) => {
    // Clicking the active option would deselect it; a chosen model stays chosen.
    if (next !== 'role' && next !== 'scopes') return;
    if (next === grantKind) return;
    form.setValue('grantKind', next, { shouldDirty: true, shouldValidate: true });
    if (next === 'role') {
      form.setValue('permissionIds', [], { shouldValidate: true });
    } else {
      form.setValue('roleId', undefined, { shouldValidate: true });
    }
  };

  return (
    <FeatureModuleCard title={t('title')} description={t('description')} collapsible>
      <ToggleGroup
        type="single"
        variant="outline"
        value={grantKind ?? ''}
        onValueChange={handleChange}
        aria-label={t('label')}
        className="grid w-full grid-cols-1 items-stretch gap-3 sm:grid-cols-2"
      >
        {OPTIONS.map((option) => (
          <ToggleGroupItem
            key={option}
            value={option}
            className={optionClassName}
            aria-describedby={`api-key-grant-kind-${option}-description`}
          >
            <span className="text-sm font-medium">{t(`${option}.title`)}</span>
            <span
              id={`api-key-grant-kind-${option}-description`}
              className="text-xs font-normal text-muted-foreground"
            >
              {t(`${option}.description`)}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FeatureModuleCard>
  );
}
