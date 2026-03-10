import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const itemVariants = cva('flex items-start gap-3 w-full min-w-0 text-left', {
  variants: {
    variant: {
      default: '',
      outline: 'rounded-lg border border-border bg-background px-3 py-2',
      muted: 'rounded-lg bg-muted/50 px-3 py-2',
    },
    size: {
      default: 'py-2',
      sm: 'py-1.5',
      xs: 'py-1',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const itemMediaVariants = cva('flex shrink-0 items-center justify-center', {
  variants: {
    variant: {
      default: '',
      icon: 'size-5 text-muted-foreground [&_svg]:size-4',
      image: 'overflow-hidden rounded-md',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

function Item({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof itemVariants>) {
  return (
    <div
      data-slot="item"
      role="listitem"
      className={cn(itemVariants({ variant, size, className }))}
      {...props}
    />
  );
}

function ItemGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-group"
      role="list"
      className={cn('flex flex-col gap-0', className)}
      {...props}
    />
  );
}

function ItemMedia({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof itemMediaVariants>) {
  return (
    <div
      data-slot="item-media"
      className={cn(itemMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

function ItemContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-content"
      className={cn('min-w-0 flex-1 space-y-0.5', className)}
      {...props}
    />
  );
}

function ItemTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-title"
      className={cn('text-sm font-medium leading-none', className)}
      {...props}
    />
  );
}

function ItemDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Item, ItemGroup, ItemMedia, ItemContent, ItemTitle, ItemDescription };
