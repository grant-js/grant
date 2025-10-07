'use client';

import { ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { CopyToClipboard } from './CopyToClipboard';

export interface AuditField {
  key: string;
  icon: ReactNode;
  label: string;
  getValue: (item: any) => string;
}

export interface AuditProps {
  fields: AuditField[];
  item: any;
  className?: string;
}

export function Audit({ fields, item, className }: AuditProps) {
  return (
    <TooltipProvider>
      <div
        className={`flex items-center gap-3 text-xs text-muted-foreground/60 ${className || ''}`}
      >
        {fields.map((field) => {
          const value = field.getValue(item);

          return (
            <Tooltip key={field.key}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  {field.icon}
                  <span>{field.label}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-1">
                <CopyToClipboard text={value} size="sm" variant="ghost" />
                <span>{value}</span>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
