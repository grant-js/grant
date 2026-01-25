import * as React from 'react';

import { cn } from '@/lib/utils';

const Empty = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="empty"
      className={cn('flex flex-col items-center justify-center gap-6 p-8 text-center', className)}
      {...props}
    />
  )
);
Empty.displayName = 'Empty';

const EmptyHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="empty-header"
      className={cn('flex flex-col items-center gap-3', className)}
      {...props}
    />
  )
);
EmptyHeader.displayName = 'EmptyHeader';

const EmptyMedia = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'icon';
  }
>(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    data-slot="empty-media"
    className={cn(
      'flex items-center justify-center',
      variant === 'icon' && 'mb-2 size-10 rounded-lg shrink-0 bg-muted text-foreground',
      className
    )}
    {...props}
  />
));
EmptyMedia.displayName = 'EmptyMedia';

const EmptyTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      data-slot="empty-title"
      className={cn('text-lg font-semibold', className)}
      {...props}
    />
  )
);
EmptyTitle.displayName = 'EmptyTitle';

const EmptyDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-slot="empty-description"
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
EmptyDescription.displayName = 'EmptyDescription';

const EmptyContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="empty-content"
      className={cn('flex flex-col items-center gap-2', className)}
      {...props}
    />
  )
);
EmptyContent.displayName = 'EmptyContent';

export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle };
