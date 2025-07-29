'use client';

import { useCallback, useRef, useEffect, useState, ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface BadgeItem {
  id: string;
  label: string;
  className?: string; // Custom className for this specific badge
  [key: string]: any; // Allow any additional properties
}

interface ScrollBadgesProps {
  items: BadgeItem[];
  title?: string;
  icon?: ReactNode;
  height?: number; // Height in pixels
  defaultBadgeClassName?: string; // Default styling for badges
  className?: string;
}

export function ScrollBadges({
  items,
  title,
  icon,
  height = 80,
  defaultBadgeClassName = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
  className,
}: ScrollBadgesProps) {
  const t = useTranslations('common');
  const phantomRef = useRef<HTMLDivElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);

  const renderItems = useCallback(
    () => (
      <div className="flex flex-wrap gap-2 pr-4">
        {items.map((item) => (
          <span key={item.id} className={cn(defaultBadgeClassName, item.className)}>
            {item.label}
          </span>
        ))}
      </div>
    ),
    [items, defaultBadgeClassName]
  );

  // Measure the natural height of the content
  useEffect(() => {
    if (phantomRef.current) {
      const naturalHeight = phantomRef.current.clientHeight;
      setNeedsScroll(naturalHeight > height);
    }
  }, [items, height]);

  if (items.length === 0) {
    return (
      <div className={cn('space-y-2', className)}>
        {title && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {title}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 italic">
            {t('emptyElements', { title: title || 'items' })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {title && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {title}
        </div>
      )}

      {/* Phantom element to measure natural height */}
      <div
        ref={phantomRef}
        className="invisible absolute pointer-events-none"
        style={{ visibility: 'hidden', position: 'absolute' }}
      >
        {renderItems()}
      </div>

      {/* Actual content */}
      {needsScroll ? (
        <ScrollArea style={{ height: `${height}px` }}>{renderItems()}</ScrollArea>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item.id} className={cn(defaultBadgeClassName, item.className)}>
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
