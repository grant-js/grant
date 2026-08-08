'use client';

import { Info } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface FieldInfoPopoverLink {
  href: string;
  label: string;
}

export interface FieldInfoPopoverProps {
  description: string;
  link?: FieldInfoPopoverLink;
  /** Accessible name for the trigger (e.g. "Field information"). */
  ariaLabel?: string;
  iconClassName?: string;
  /** When true, click does not bubble (e.g. inside a collapsible trigger). */
  stopPropagation?: boolean;
  className?: string;
}

/**
 * Info icon that opens a popover with field help and an optional docs link.
 * Matches {@link FormDialog} field labels (e.g. permission condition).
 */
export function FieldInfoPopover({
  description,
  link,
  ariaLabel = 'Field information',
  iconClassName = 'size-4',
  stopPropagation = false,
  className,
}: FieldInfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
          onKeyDown={
            stopPropagation
              ? (event) => {
                  event.stopPropagation();
                }
              : undefined
          }
          className={cn(
            'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            className
          )}
          aria-label={ariaLabel}
        >
          <Info className={iconClassName} aria-hidden />
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="z-[99999999] w-80"
        align="start"
        onOpenAutoFocus={stopPropagation ? (event) => event.preventDefault() : undefined}
      >
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{description}</p>
          {link ? (
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {link.label}
            </a>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
