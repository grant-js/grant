'use client';

import { type ReactNode } from 'react';

import { BaseEntity, EmptyState, EmptyStateProps, SkeletonConfig } from '@/components/common';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface CardGridProps<TEntity extends BaseEntity> {
  entities: TEntity[];
  loading: boolean;
  emptyState: EmptyStateProps;
  skeleton: SkeletonConfig;
  gridClassName?: string;
  cardClassName?: string;
  renderHeader: (entity: TEntity) => ReactNode;
  renderBody?: (entity: TEntity) => ReactNode;
  renderFooter?: (entity: TEntity) => ReactNode;
}

export function CardGrid<TEntity extends BaseEntity>({
  entities,
  loading,
  emptyState,
  skeleton,
  renderHeader,
  renderBody,
  renderFooter,
  gridClassName,
  cardClassName,
}: CardGridProps<TEntity>) {
  return (
    <>
      {entities.length === 0 && !loading ? (
        <div className="flex grow justify-center">
          <EmptyState
            icon={emptyState.icon}
            title={emptyState.title}
            description={emptyState.description}
            action={emptyState.action}
          />
        </div>
      ) : (
        <div
          className={cn(
            'p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4',
            gridClassName
          )}
        >
          {loading ? (
            <>
              {Array.from({ length: skeleton.count }).map((_, i) => (
                <div key={i}>{skeleton.component}</div>
              ))}
            </>
          ) : (
            entities.map((entity) => (
              <Card key={entity.id} className={cn('group relative h-full', cardClassName)}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
                  {renderHeader(entity)}
                </CardHeader>

                {renderBody && (
                  <CardContent className="pt-0 flex-1">{renderBody(entity)}</CardContent>
                )}

                {renderFooter && (
                  <CardFooter className="px-6 mt-auto">{renderFooter(entity)}</CardFooter>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </>
  );
}
