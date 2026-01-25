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
          size="icon"
          onClick={onRefresh}
          disabled={loading || !onRefresh}
          className={cn('h-8 w-8', className)}
          aria-label={t('actions.refresh')}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{t('actions.refresh')}</p>
      </TooltipContent>
    </Tooltip>
  );
}
