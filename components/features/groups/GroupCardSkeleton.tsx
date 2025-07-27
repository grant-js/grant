'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function GroupCardSkeleton() {
  return (
    <div className="group relative h-full">
      <Card className="h-full">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-full bg-muted animate-pulse" />
            <div className="min-w-0 space-y-2">
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-3 w-28 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-8 shrink-0 rounded-md bg-muted animate-pulse" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            <div className="h-5 w-20 bg-muted rounded animate-pulse" />
            <div className="h-5 w-14 bg-muted rounded animate-pulse" />
            <div className="h-5 w-18 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
