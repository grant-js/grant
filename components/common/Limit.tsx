'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" className={className}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {t(translationKey)}: {limit}
            </div>
            <ChevronDown className="size-4" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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
  );
}
