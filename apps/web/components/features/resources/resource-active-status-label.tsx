'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

interface ResourceActiveStatusLabelProps {
  isActive: boolean;
  className?: string;
}

export function ResourceActiveStatusLabel({ isActive, className }: ResourceActiveStatusLabelProps) {
  const t = useTranslations('resources');

  return (
    <span
      className={cn(
        'text-sm',
        isActive ? 'text-green-600 dark:text-green-500' : 'text-destructive',
        className
      )}
    >
      {isActive ? t('activeYes') : t('activeNo')}
    </span>
  );
}
