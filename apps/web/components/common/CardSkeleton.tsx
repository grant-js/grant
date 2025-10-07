'use client';

import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

export interface CardSkeletonProps {
  /**
   * Number of tag placeholders to render in the card content
   * @default 4
   */
  tagCount?: number;
  /**
   * Additional CSS classes to apply to the card
   */
  className?: string;
  /**
   * Whether to show audit field placeholders in the footer
   * @default true
   */
  showAuditFields?: boolean;
  /**
   * Whether to show multiple sections (like roles/groups and tags)
   * @default true
   */
  showMultipleSections?: boolean;
}

export function CardSkeleton({
  tagCount = 4,
  className,
  showAuditFields = true,
  showMultipleSections = true,
}: CardSkeletonProps) {
  return (
    <div className="group relative h-full">
      <Card className={`h-full ${className || ''}`}>
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
          <div className="space-y-3">
            {showMultipleSections ? (
              <>
                {/* First section (roles/groups/permissions) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="h-3 w-3 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: Math.ceil(tagCount / 2) }, (_, index) => (
                      <div
                        key={`section1-${index}`}
                        className={`h-5 bg-muted rounded animate-pulse ${
                          index % 3 === 0 ? 'w-20' : index % 3 === 1 ? 'w-16' : 'w-24'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Second section (tags) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="h-3 w-3 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-8 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: Math.ceil(tagCount / 2) }, (_, index) => (
                      <div
                        key={`section2-${index}`}
                        className="h-3 w-3 rounded-full bg-muted animate-pulse"
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* Single section for simpler cards */
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="h-3 w-3 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: tagCount }, (_, index) => (
                    <div
                      key={index}
                      className={`h-5 bg-muted rounded animate-pulse ${
                        index % 4 === 0
                          ? 'w-16'
                          : index % 4 === 1
                            ? 'w-20'
                            : index % 4 === 2
                              ? 'w-14'
                              : 'w-18'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        {showAuditFields && (
          <CardFooter className="p-0 px-4">
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 bg-muted rounded animate-pulse" />
                <div className="h-3 w-8 bg-muted rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 bg-muted rounded animate-pulse" />
                <div className="h-3 w-12 bg-muted rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 bg-muted rounded animate-pulse" />
                <div className="h-3 w-12 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
