'use client';

import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface InfoRow {
  label: string;
  value: React.ReactNode;
}

interface InfoPanelProps {
  rows: InfoRow[];
  className?: string;
  compact?: boolean;
}

/**
 * Reusable information panel component that displays a list of labeled information rows
 *
 * @param compact - When true, displays labels and values side-by-side with consistent text size
 */
export function InfoPanel({ rows, className, compact = false }: InfoPanelProps) {
  if (rows.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn('space-y-3 rounded-lg border p-4', className)}>
        {rows.map((row, index) => (
          <div key={index}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium text-muted-foreground flex-shrink-0">{row.label}</p>
              <div className="text-sm text-right flex-1 min-w-0">{row.value}</div>
            </div>
            {index < rows.length - 1 && <Separator className="mt-3" />}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3 rounded-lg border p-4', className)}>
      {rows.map((row, index) => (
        <div key={index}>
          <p className="text-sm font-medium text-muted-foreground">{row.label}</p>
          <div className="mt-1">{row.value}</div>
          {index < rows.length - 1 && <Separator className="mt-3" />}
        </div>
      ))}
    </div>
  );
}
