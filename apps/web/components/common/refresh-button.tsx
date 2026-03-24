'use client';

import { useTranslations } from 'next-intl';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  onRefresh?: () => void;
  loading?: boolean;
  /** When true, show icon only (no text). When false, text is shown above the breakpoint given by labelMinWidthPx. */
  iconOnly?: boolean;
  /** When iconOnly is false, show label at viewport width >= this (px). Default 1600 (dashboard). Use 1200 for card toolbars (user detail, API keys). */
  labelMinWidthPx?: 1200 | 1600;
  className?: string;
}

export function RefreshButton({
  onRefresh,
  loading = false,
  iconOnly = false,
  labelMinWidthPx = 1600,
  className,
}: RefreshButtonProps) {
  const t = useTranslations('common');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="default"
          onClick={onRefresh}
          disabled={loading || !onRefresh}
          className={cn(
            iconOnly
              ? 'size-9 min-w-9 max-w-9 p-2'
              : labelMinWidthPx === 1200
                ? 'w-full sm:w-auto sm:max-[1199px]:size-9 sm:max-[1199px]:min-w-9 sm:max-[1199px]:max-w-9 sm:max-[1199px]:p-2 min-[1200px]:px-4 min-[1200px]:py-2'
                : 'w-full sm:w-auto sm:size-9 sm:min-w-9 sm:max-w-9 sm:p-2',
            className
          )}
          aria-label={t('actions.refresh')}
        >
          <RefreshCw className={cn('size-4 shrink-0', loading && 'animate-spin')} />
          {!iconOnly && (
            <span
              className={
                labelMinWidthPx === 1200
                  ? 'hidden max-sm:inline min-[1200px]:inline'
                  : 'hidden max-sm:inline'
              }
            >
              {t('actions.refresh')}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{t('actions.refresh')}</p>
      </TooltipContent>
    </Tooltip>
  );
}
