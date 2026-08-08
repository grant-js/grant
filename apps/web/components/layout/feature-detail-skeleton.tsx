'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { FeatureDetailLayout } from './feature-detail-layout';

type FeatureDetailSkeletonCardVariant = 'form' | 'table' | 'json';

interface FeatureDetailSkeletonCard {
  variant?: FeatureDetailSkeletonCardVariant;
  rows?: number;
  showAvatar?: boolean;
  showFooter?: boolean;
  showToolbar?: boolean;
}

interface FeatureDetailSkeletonProps {
  cards: FeatureDetailSkeletonCard[];
}

function SkeletonField({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function SkeletonTableRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-24 shrink-0" />
          <Skeleton
            className={cn('h-4 min-w-0 flex-1', index % 2 === 0 ? 'max-w-72' : 'max-w-48')}
          />
        </div>
      ))}
    </div>
  );
}

function SkeletonBody({ card }: { card: FeatureDetailSkeletonCard }) {
  if (card.variant === 'json') {
    return <Skeleton className="h-40 w-full" />;
  }

  if (card.variant === 'table') {
    return (
      <>
        {card.showToolbar ? <Skeleton className="mb-4 h-10 w-full" /> : null}
        <SkeletonTableRows rows={card.rows ?? 4} />
      </>
    );
  }

  const rows = card.rows ?? 3;

  return (
    <div className={cn('flex gap-4', card.showAvatar ? 'items-start' : 'flex-col')}>
      {card.showAvatar ? <Skeleton className="size-16 shrink-0 rounded-full" /> : null}
      <div className="min-w-0 flex-1 space-y-4">
        {Array.from({ length: rows }, (_, index) => (
          <SkeletonField key={index} />
        ))}
        <SkeletonTableRows rows={2} />
      </div>
    </div>
  );
}

function FeatureDetailSkeletonModule({ card }: { card: FeatureDetailSkeletonCard }) {
  return (
    <Card className="w-full flex flex-col gap-0 py-0" aria-hidden="true">
      <div className="flex w-full items-center gap-4 px-6 pt-6 pb-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </div>
        <Skeleton className="size-6 shrink-0" />
      </div>
      <Separator />
      <CardContent className="min-w-0 py-4">
        <SkeletonBody card={card} />
      </CardContent>
      {card.showFooter ? (
        <>
          <Separator />
          <CardFooter className="w-full justify-end gap-3 py-4">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-16" />
          </CardFooter>
        </>
      ) : null}
    </Card>
  );
}

export function FeatureDetailSkeleton({ cards }: FeatureDetailSkeletonProps) {
  return (
    <FeatureDetailLayout>
      {cards.map((card, index) => (
        <FeatureDetailSkeletonModule key={index} card={card} />
      ))}
    </FeatureDetailLayout>
  );
}
