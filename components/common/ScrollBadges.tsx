'use client';

import { useCallback, useRef, useEffect, useState, ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface BadgeItem {
  id: string;
  label: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'; // Badge variant
  className?: string; // Custom className for this specific badge
  [key: string]: any; // Allow any additional properties
}

interface ScrollBadgesProps {
  items: BadgeItem[];
  title?: string;
  icon?: ReactNode;
  height?: number; // Height in pixels
  defaultVariant?: 'default' | 'secondary' | 'destructive' | 'outline'; // Default badge variant
  className?: string;
  showAsRound?: boolean; // New prop to show badges as round circles without text
}

export function ScrollBadges({
  items,
  title,
  icon,
  height = 80,
  defaultVariant = 'outline',
  className,
  showAsRound = false,
}: ScrollBadgesProps) {
  const t = useTranslations('common');
  const phantomRef = useRef<HTMLDivElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);

  const renderItems = useCallback(
    () => (
      <div className="flex flex-wrap gap-2 pr-4">
        {items.map((item) => (
          <Badge
            key={item.id}
            variant={item.variant || defaultVariant}
            className={cn(
              item.className,
              showAsRound && 'w-3 h-3 rounded-full p-0 border-2 bg-transparent',
              !showAsRound && 'bg-transparent border-2'
            )}
          >
            {!showAsRound && item.label}
          </Badge>
        ))}
      </div>
    ),
    [items, defaultVariant, showAsRound]
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
          <Badge variant="secondary" className="italic">
            {t('emptyElements', { title: title || 'items' })}
          </Badge>
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
            <Badge
              key={item.id}
              variant={item.variant || defaultVariant}
              className={cn(
                item.className,
                showAsRound && 'w-3 h-3 rounded-full p-0 border-2 bg-transparent',
                !showAsRound && 'bg-transparent border-2'
              )}
            >
              {!showAsRound && item.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
