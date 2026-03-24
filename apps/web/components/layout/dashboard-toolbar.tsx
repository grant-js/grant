'use client';

import { ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { Breadcrumb } from '@/components/common';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface DashboardToolbarProps {
  actions?: ReactNode;
}

export function DashboardToolbar({ actions }: DashboardToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        'flex flex-col min-[992px]:flex-row min-[992px]:items-center min-[992px]:justify-between transition-all duration-200 ease-in-out',
        'gap-4',
        !isExpanded && 'max-sm:gap-0'
      )}
    >
      <div className="flex min-w-0 w-full min-[992px]:flex-1 items-center justify-between min-[992px]:justify-start gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SidebarTrigger className="flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <Breadcrumb />
          </div>
        </div>
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
        <div className="flex w-full min-w-0 min-[992px]:w-auto flex-shrink-0">
          <div
            className={cn(
              'flex w-full flex-col overflow-hidden transition-all duration-200 ease-in-out',
              'sm:flex-row sm:flex-wrap sm:items-center',
              'sm:max-h-none sm:gap-2 max-[1600px]:sm:gap-1.5',
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
