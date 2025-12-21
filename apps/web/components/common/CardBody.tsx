'use client';

import { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface CardBodyItem {
  label: {
    icon?: ReactNode;
    text: string;
  };
  value: ReactNode;
  className?: string;
}

export interface CardBodyProps {
  items: CardBodyItem[];
  className?: string;
  itemSpacing?: 'sm' | 'md' | 'lg'; // Spacing between items
}

export function CardBody({ items, className, itemSpacing = 'md' }: CardBodyProps) {
  const spacingClass = {
    sm: 'space-y-2',
    md: 'space-y-3',
    lg: 'space-y-4',
  }[itemSpacing];

  return (
    <div className={cn(spacingClass, className)}>
      {items.map((item, index) => (
        <div key={index} className={cn('space-y-2', item.className)}>
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
            {item.label.icon && <span className="flex-shrink-0">{item.label.icon}</span>}
            {item.label.text}
          </div>
          <div>{item.value}</div>
        </div>
      ))}
    </div>
  );
}
