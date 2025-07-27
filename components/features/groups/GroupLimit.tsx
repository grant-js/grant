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

interface GroupLimitProps {
  limit: number;
  onLimitChange: (limit: number) => void;
}

const LIMIT_OPTIONS = [10, 25, 50, 100];

export function GroupLimit({ limit, onLimitChange }: GroupLimitProps) {
  const t = useTranslations('groups');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" className="w-full sm:w-auto">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {t('limit.label')}: {limit}
            </div>
            <ChevronDown className="size-4" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LIMIT_OPTIONS.map((option) => (
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
