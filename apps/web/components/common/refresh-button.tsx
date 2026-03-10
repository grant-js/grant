'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

export function RefreshButton({ onRefresh, loading = false, className }: RefreshButtonProps) {
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
            'w-full sm:w-auto sm:size-9 sm:min-w-9 sm:max-w-9 sm:p-2 min-[1600px]:size-auto min-[1600px]:min-w-0 min-[1600px]:max-w-none min-[1600px]:aspect-auto min-[1600px]:px-4 min-[1600px]:py-2',
            className
          )}
          aria-label={t('actions.refresh')}
        >
          <RefreshCw className={cn('size-4 shrink-0', loading && 'animate-spin')} />
          <span className="sm:hidden">{t('actions.refresh')}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{t('actions.refresh')}</p>
      </TooltipContent>
    </Tooltip>
  );
}
