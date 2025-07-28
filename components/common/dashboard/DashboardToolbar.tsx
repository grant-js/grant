'use client';

import { ReactNode, useState } from 'react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardToolbarProps {
  title: string;
  actions?: ReactNode;
}

export function DashboardToolbar({ title, actions }: DashboardToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-4 transition-all duration-200 ease-in-out',
        isExpanded ? 'gap-4' : 'gap-0'
      )}
    >
      <div className="flex items-center justify-between sm:justify-start gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
        {actions && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="sm:hidden"
          >
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        )}
      </div>
      {actions && (
        <div className="flex items-center w-full sm:w-auto">
          <div
            className={cn(
              'flex flex-col sm:flex-row sm:items-center overflow-hidden transition-all duration-200 ease-in-out w-full',
              'sm:max-h-none sm:gap-4',
              isExpanded ? 'max-h-[500px] gap-4' : 'max-h-0 sm:max-h-none'
            )}
          >
            {actions}
          </div>
        </div>
      )}
    </div>
  );
}
