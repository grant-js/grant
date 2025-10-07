'use client';

import * as React from 'react';
import { useRef, useEffect, useState } from 'react';

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

import { cn } from '@/lib/utils';

interface AutoScrollAreaProps extends React.ComponentProps<typeof ScrollAreaPrimitive.Root> {
  children: React.ReactNode;
  maxHeight?: string | number;
  className?: string;
  fallbackClassName?: string; // Class applied when no scroll is needed
}

function AutoScrollArea({
  children,
  maxHeight = '200px',
  className,
  fallbackClassName,
  ...props
}: AutoScrollAreaProps) {
  const phantomRef = useRef<HTMLDivElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);

  // Measure the natural height of the content
  useEffect(() => {
    if (phantomRef.current) {
      const naturalHeight = phantomRef.current.clientHeight;
      const maxHeightPx =
        typeof maxHeight === 'string' ? parseInt(maxHeight.replace('px', '')) : maxHeight;
      setNeedsScroll(naturalHeight > maxHeightPx);
    }
  }, [children, maxHeight]);

  return (
    <>
      {/* Phantom element to measure natural height */}
      <div
        ref={phantomRef}
        className="invisible absolute pointer-events-none"
        style={{ visibility: 'hidden', position: 'absolute' }}
      >
        {children}
      </div>

      {/* Actual content */}
      {needsScroll ? (
        <ScrollArea
          className={className}
          style={{ height: typeof maxHeight === 'string' ? maxHeight : `${maxHeight}px` }}
          {...props}
        >
          {children}
        </ScrollArea>
      ) : (
        <div className={cn(fallbackClassName)}>{children}</div>
      )}
    </>
  );
}

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'flex touch-none p-px transition-colors select-none',
        orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent',
        orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar, AutoScrollArea };
