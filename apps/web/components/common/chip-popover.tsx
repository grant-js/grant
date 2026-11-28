'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 150;

export interface ChipPopoverProps {
  /** The chip's text, e.g. "3 roles". */
  label: ReactNode;
  /** Whether there is anything to show; without, the chip is plain and opens nothing. */
  hasContent: boolean;
  /** Called each time the popover opens, e.g. to load what it shows on the first open. */
  onOpen?: () => void;
  /** Width and padding of the popover. */
  contentClassName?: string;
  /** What the popover shows. */
  children: ReactNode;
}

/**
 * A list chip with a popover: opens on hover (after a short delay), focus or tap, and closes
 * shortly after the pointer leaves both. Without content it is a plain chip, like a zero count.
 * The relationship count chips and the permission condition chip are built on it.
 */
export function ChipPopover({
  label,
  hasContent,
  onOpen,
  contentClassName,
  children,
}: ChipPopoverProps) {
  const [open, setOpen] = useState(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const clearTimers = () => {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };
  useEffect(() => clearTimers, []);

  const show = () => {
    clearTimers();
    onOpen?.();
    setOpen(true);
  };
  const showSoon = () => {
    clearTimers();
    openTimer.current = window.setTimeout(show, OPEN_DELAY_MS);
  };
  const hideSoon = () => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  if (!hasContent) {
    return <Badge variant="secondary">{label}</Badge>;
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) show();
        else {
          clearTimers();
          setOpen(false);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onMouseEnter={showSoon}
          onMouseLeave={hideSoon}
          onFocus={show}
          aria-haspopup="dialog"
        >
          <Badge variant="secondary" className="cursor-pointer">
            {label}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn('w-64 p-2', contentClassName)}
        onMouseEnter={clearTimers}
        onMouseLeave={hideSoon}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
