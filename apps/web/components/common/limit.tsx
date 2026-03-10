'use client';

import { ChevronDown, List } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface LimitProps {
  limit: number;
  onLimitChange: (limit: number) => void;
  namespace: string;
  translationKey?: string;
  options?: number[];
  className?: string;
}

const DEFAULT_OPTIONS = [10, 25, 50, 100];

export function Limit({
  limit,
  onLimitChange,
  namespace,
  translationKey = 'limit.label',
  options = DEFAULT_OPTIONS,
  className = 'w-full sm:w-auto',
}: LimitProps) {
  const t = useTranslations(namespace);

  const tooltipText = `${t(translationKey)}: ${limit}`;

  const buttonContent = (
    <Button
      variant="outline"
      size="default"
      className={`${className} sm:aspect-square sm:p-2 min-[1600px]:aspect-auto min-[1600px]:px-4 min-[1600px]:py-2`}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <List className="size-4 shrink-0 min-[1600px]:hidden" />
          <span className="sm:hidden min-[1600px]:inline">
            {t(translationKey)}: {limit}
          </span>
        </div>
        <ChevronDown className="size-4 max-[1600px]:hidden" />
      </div>
    </Button>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{buttonContent}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">{tooltipText}</TooltipContent>
          <DropdownMenuContent align="end" fullWidthOnMobile>
            {options.map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() => onLimitChange(option)}
                className="cursor-pointer"
              >
                {option}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </Tooltip>
    </TooltipProvider>
  );
}
