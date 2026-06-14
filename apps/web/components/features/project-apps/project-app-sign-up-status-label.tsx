'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

interface ProjectAppSignUpStatusLabelProps {
  allowSignUp?: boolean | null;
  className?: string;
}

export function ProjectAppSignUpStatusLabel({
  allowSignUp,
  className,
}: ProjectAppSignUpStatusLabelProps) {
  const t = useTranslations('projectApps');
  const enabled = allowSignUp !== false;

  return (
    <span
      className={cn(
        'text-sm',
        enabled ? 'text-green-600 dark:text-green-500' : 'text-destructive',
        className
      )}
    >
      {enabled ? t('common.enabled') : t('common.disabled')}
    </span>
  );
}
