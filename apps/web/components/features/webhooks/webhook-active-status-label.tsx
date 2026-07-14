'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

interface WebhookActiveStatusLabelProps {
  active: boolean;
  className?: string;
}

export function WebhookActiveStatusLabel({ active, className }: WebhookActiveStatusLabelProps) {
  const t = useTranslations('webhooks');

  return (
    <span
      className={cn(
        'text-sm',
        active ? 'text-green-600 dark:text-green-500' : 'text-destructive',
        className
      )}
    >
      {active ? t('activeYes') : t('activeNo')}
    </span>
  );
}
